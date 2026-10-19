"""
BiharStack AI - Advanced HTML Content Extractor
Deep business entity harvesting (Phone numbers, WhatsApp, Emails, Addresses, JSON-LD Schema, Pricing, FAQs, Policies).
Extracts clean titles, headings, body text, lists, and metadata while stripping boilerplate.
"""
from bs4 import BeautifulSoup, Comment
import hashlib
import json
import re
from typing import List, Dict, Any, Tuple
from .models import ExtractedPage
from .normalizer import resolve_link, normalize_url, is_same_domain, is_crawlable_url

# HTML tags to strip for main body reading
TAGS_TO_REMOVE = [
    "nav", "aside", "style", "noscript",
    "svg", "iframe", "form", "button", "input", "textarea", "select",
    "audio", "video", "canvas", "map", "object", "embed"
]

# Patterns in class or id attributes that indicate boilerplate
BOILERPLATE_PATTERNS = re.compile(
    r"(cookie|banner|consent|modal|popup|subscribe|newsletter|widget|sidebar|ad-|advertisement)",
    re.IGNORECASE
)

def extract_structured_business_data(soup: BeautifulSoup, raw_html: str, url: str) -> Dict[str, Any]:
    """
    Mine critical business entities from JSON-LD, headers, footers, microdata, and framework meta.
    """
    data: Dict[str, Any] = {
        "phones": [],
        "emails": [],
        "whatsapp": [],
        "addresses": [],
        "opening_hours": [],
        "pricing": [],
        "faqs": [],
        "socials": {},
        "policies": {},
        "organization": {},
        "framer_search_url": None,
    }

    # 0. Check for Framer search index metadata (Floto, modern Framer sites)
    framer_meta = soup.find("meta", attrs={"name": re.compile(r"framer-search-index", re.I)})
    if framer_meta and framer_meta.get("content"):
        data["framer_search_url"] = framer_meta["content"].strip()

    # 1. JSON-LD Schema.org extraction
    for script in soup.find_all("script", type=lambda t: t and "ld+json" in t.lower()):
        try:
            content = script.string
            if not content:
                continue
            payload = json.loads(content.strip())
            items = []
            if isinstance(payload, list):
                items = payload
            elif isinstance(payload, dict):
                if "@graph" in payload and isinstance(payload["@graph"], list):
                    items = payload["@graph"]
                else:
                    items = [payload]

            for item in items:
                if not isinstance(item, dict):
                    continue
                schema_type = str(item.get("@type", "")).lower()

                # Organization / LocalBusiness
                if any(k in schema_type for k in ("organization", "business", "company", "store", "restaurant", "corporation")):
                    if item.get("name"):
                        data["organization"]["name"] = item["name"]
                    if item.get("description"):
                        data["organization"]["description"] = item["description"]

                    # Telephone
                    tel = item.get("telephone")
                    if isinstance(tel, list):
                        data["phones"].extend([str(t).strip() for t in tel if t])
                    elif tel:
                        data["phones"].append(str(tel).strip())

                    # Email
                    em = item.get("email")
                    if isinstance(em, list):
                        data["emails"].extend([str(e).strip() for e in em if e])
                    elif em:
                        data["emails"].append(str(em).strip())

                    # Address
                    addr = item.get("address")
                    if isinstance(addr, dict):
                        addr_str = ", ".join(filter(None, [
                            addr.get("streetAddress"),
                            addr.get("addressLocality"),
                            addr.get("addressRegion"),
                            addr.get("postalCode"),
                            addr.get("addressCountry")
                        ]))
                        if addr_str:
                            data["addresses"].append(addr_str)
                    elif isinstance(addr, str) and addr:
                        data["addresses"].append(addr)

                    # Hours
                    if item.get("openingHours"):
                        data["opening_hours"].append(str(item["openingHours"]))

                # FAQPage
                if "faqpage" in schema_type or "faq" in schema_type:
                    entities = item.get("mainEntity", [])
                    if isinstance(entities, list):
                        for q_item in entities:
                            if isinstance(q_item, dict):
                                q_text = q_item.get("name") or q_item.get("text")
                                ans = q_item.get("acceptedAnswer", {})
                                a_text = ans.get("text") if isinstance(ans, dict) else str(ans)
                                if q_text and a_text:
                                    data["faqs"].append({"question": str(q_text).strip(), "answer": str(a_text).strip()})

                # Products / Offers
                if "product" in schema_type or "service" in schema_type or "offer" in schema_type:
                    offers = item.get("offers", item)
                    if isinstance(offers, dict) and offers.get("price"):
                        price_str = f"{offers.get('priceCurrency', '₹')} {offers.get('price')}"
                        data["pricing"].append(f"{item.get('name', 'Service/Plan')}: {price_str}")

        except Exception:
            continue

    # 2. Extract Phone, Email, WhatsApp, Socials & Policy links
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        href_lower = href.lower()
        if href_lower.startswith("tel:"):
            num = href[4:].strip()
            if len(re.sub(r"\D", "", num)) >= 7:
                data["phones"].append(num)
        elif "wa.me/" in href_lower or "api.whatsapp.com/send" in href_lower:
            match = re.search(r"phone=([0-9+]+)|wa\.me/([0-9+]+)", href)
            if match:
                wa_num = match.group(1) or match.group(2)
                data["whatsapp"].append(wa_num)
        elif href_lower.startswith("mailto:"):
            mail = href[7:].split("?")[0].strip()
            if "@" in mail and "." in mail:
                data["emails"].append(mail)
        # Social links
        elif "twitter.com/" in href_lower or "x.com/" in href_lower:
            data["socials"]["twitter"] = href
        elif "linkedin.com/" in href_lower:
            data["socials"]["linkedin"] = href
        elif "discord.gg/" in href_lower or "discord.com/invite" in href_lower:
            data["socials"]["discord"] = href
        elif "github.com/" in href_lower and "github.com/login" not in href_lower:
            data["socials"]["github"] = href
        elif "instagram.com/" in href_lower:
            data["socials"]["instagram"] = href
        elif "youtube.com/" in href_lower:
            data["socials"]["youtube"] = href
        # Policy links
        if "privacy" in href_lower:
            data["policies"]["privacy"] = href
        elif "terms" in href_lower:
            data["policies"]["terms"] = href
        elif "refund" in href_lower or "cancellation" in href_lower:
            data["policies"]["refund"] = href

    # 3. Dedicated header & footer text scanning before removal
    header_footer_text = ""
    for elem in soup.find_all(["footer", "header", "address", "div"], class_=re.compile(r"footer|header|contact|top-bar|info|about", re.I)):
        header_footer_text += " " + elem.get_text(separator=" ", strip=True)

    combined_text = raw_html + " " + header_footer_text

    # Extract Indian mobile numbers: +91 98765 43210, etc.
    in_phones = re.findall(r"(?:(?:\+91|0091|91|0)[\s-]?)?[6789]\d{4}[\s-]?\d{5}\b", combined_text)
    for p in in_phones:
        cleaned_p = re.sub(r"[^\d+]", "", p)
        if len(cleaned_p) >= 10:
            data["phones"].append(p.strip())

    # Extract 1800 Toll Free numbers
    toll_free = re.findall(r"\b1800[\s-]?\d{3}[\s-]?\d{3,4}\b", combined_text)
    for tf in toll_free:
        data["phones"].append(tf.strip())

    # Extract Email addresses
    emails = re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", combined_text)
    for em in emails:
        em_lower = em.lower()
        if not any(em_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"]) and "schema.org" not in em_lower and "example.com" not in em_lower:
            data["emails"].append(em.strip())

    # Extract Addresses
    for addr_tag in soup.find_all("address"):
        addr_txt = addr_tag.get_text(separator=" ", strip=True)
        if len(addr_txt) > 10:
            data["addresses"].append(addr_txt)

    pin_matches = re.finditer(r"\b([A-Za-z0-9\s,.-]{10,80}(?:Patna|Bihar|Delhi|Mumbai|Bengaluru|Kolkata|Hyderabad|Chennai|Pune|Ahmedabad|Noida|Gurgaon|Jaipur|Road|Street|Nagar|Floor|Building|Tower|Marg|Vihar|Chowk)[A-Za-z0-9\s,.-]{0,50}\b(?:PIN[\s:-]*)?[1-9][0-9]{2}\s?[0-9]{3}\b)", combined_text, re.IGNORECASE)
    for pm in pin_matches:
        cand_clean = re.sub(r"\s+", " ", pm.group(1)).strip()
        if len(cand_clean) < 150:
            data["addresses"].append(cand_clean)

    # 4. Extract FAQs (<details> & <summary>, or accordion/faq classes)
    for details in soup.find_all("details"):
        summary = details.find("summary")
        if summary:
            q = summary.get_text(strip=True)
            a = details.get_text(strip=True).replace(q, "").strip()
            if q and a:
                data["faqs"].append({"question": q, "answer": a})

    for faq_box in soup.find_all(class_=re.compile(r"faq|accordion|qna|frequently-asked", re.I)):
        q_elem = faq_box.find(class_=re.compile(r"question|title|header", re.I)) or faq_box.find(["h3", "h4", "button"])
        a_elem = faq_box.find(class_=re.compile(r"answer|content|body", re.I)) or faq_box.find("p")
        if q_elem and a_elem:
            q = q_elem.get_text(strip=True)
            a = a_elem.get_text(strip=True)
            if q and a and len(q) > 5 and len(a) > 5:
                if not any(f["question"] == q for f in data["faqs"]):
                    data["faqs"].append({"question": q, "answer": a})

    # 5. Extract Pricing tables and tiers
    for price_box in soup.find_all(class_=re.compile(r"pricing|plan|tier|package|price-card", re.I)):
        title_elem = price_box.find(["h2", "h3", "h4", "strong"])
        price_elem = price_box.find(class_=re.compile(r"price|amount|cost", re.I)) or price_box.find(text=re.compile(r"₹|\$|USD|INR|Rs", re.I))
        if title_elem and price_elem:
            t = title_elem.get_text(strip=True)
            p = price_elem if isinstance(price_elem, str) else price_elem.get_text(strip=True)
            entry = f"{t}: {p}"
            if entry not in data["pricing"] and len(entry) < 100:
                data["pricing"].append(entry)

    # Deduplicate lists
    data["phones"] = list(dict.fromkeys(data["phones"]))[:10]
    data["emails"] = list(dict.fromkeys(data["emails"]))[:10]
    data["whatsapp"] = list(dict.fromkeys(data["whatsapp"]))[:5]
    data["addresses"] = list(dict.fromkeys(data["addresses"]))[:5]
    data["pricing"] = list(dict.fromkeys(data["pricing"]))[:15]
    data["faqs"] = data["faqs"][:20]

    return data

def extract_page_content(
    html: str,
    url: str,
    base_url: str,
    allow_subdomains: bool = False
) -> ExtractedPage:
    """
    Parse HTML document, extract clean readable text, and discover same-domain links.
    Also extracts deep structured business data (contacts, pricing, FAQs, address).
    """
    soup = BeautifulSoup(html, "html.parser")

    # 1. Mine business entities before stripping scripts or footers
    entities = extract_structured_business_data(soup, html, url)

    # 2. Remove comments
    for comment in soup.find_all(text=lambda text: isinstance(text, Comment)):
        comment.extract()

    # 3. Extract Page Title
    title = ""
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        title = title_tag.string.strip()

    if not title:
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            title = og_title["content"].strip()

    if not title:
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)

    if not title:
        title = "Untitled Page"

    # 4. Extract Meta Description
    meta_desc = ""
    meta_desc_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    if meta_desc_tag and meta_desc_tag.get("content"):
        meta_desc = meta_desc_tag["content"].strip()
    elif not meta_desc:
        og_desc = soup.find("meta", property="og:description")
        if og_desc and og_desc.get("content"):
            meta_desc = og_desc["content"].strip()

    # 5. Discover Internal Links before stripping navigation/header
    discovered_links: List[str] = []
    seen_links = set()

    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        resolved = resolve_link(url, href)
        if resolved:
            normalized = normalize_url(resolved)
            if (
                normalized
                and normalized not in seen_links
                and is_crawlable_url(normalized)
                and is_same_domain(base_url, normalized, allow_subdomains=allow_subdomains)
            ):
                seen_links.add(normalized)
                discovered_links.append(normalized)

    # 6. Remove unwanted structural tags
    for tag_name in TAGS_TO_REMOVE:
        for element in soup.find_all(tag_name):
            element.decompose()

    # 7. Extract Next.js / Nuxt structured state before script decomposition
    next_data_strings: List[str] = []
    next_script = soup.find("script", id="__NEXT_DATA__")
    if next_script and next_script.string:
        try:
            next_payload = json.loads(next_script.string)
            def harvest_next_strings(val):
                if isinstance(val, dict):
                    for k, v in val.items():
                        if k in ("__N_SSP", "__N_SSG", "page", "query", "buildId"):
                            continue
                        harvest_next_strings(v)
                elif isinstance(val, list):
                    for item in val:
                        harvest_next_strings(item)
                elif isinstance(val, str):
                    s = val.strip()
                    if len(s) > 25 and not s.startswith("http") and not s.startswith("/") and "<html" not in s:
                        next_data_strings.append(s)
            harvest_next_strings(next_payload.get("props", {}))
        except Exception:
            pass

    for script in soup.find_all("script"):
        script.decompose()

    # 8. Remove elements with boilerplate class/id or hidden styles
    for element in soup.find_all(True):
        if not hasattr(element, "attrs") or element.attrs is None:
            continue

        style = str(element.attrs.get("style", "")).lower()
        if "display:none" in style or "visibility:hidden" in style:
            element.decompose()
            continue

        if element.attrs.get("hidden") is not None or element.attrs.get("aria-hidden") == "true":
            element.decompose()
            continue

        classes_val = element.attrs.get("class", [])
        classes = " ".join(classes_val) if isinstance(classes_val, list) else str(classes_val)
        elem_id = str(element.attrs.get("id", ""))
        combined_attr = f"{classes} {elem_id}"

        if element.name not in ("body", "html", "main", "article", "footer", "header") and BOILERPLATE_PATTERNS.search(combined_attr):
            element.decompose()

    # 9. Extract Main Readable Text Content
    main_container = soup.find("main") or soup.find("article") or soup.find("body") or soup

    content_blocks: List[str] = []

    if meta_desc:
        content_blocks.append(f"Description: {meta_desc}")

    # Extract headings, paragraphs, list items, and table cells in document order
    for elem in main_container.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote", "th", "td"]):
        text = elem.get_text(separator=" ", strip=True)
        if text and len(text) > 3:
            if elem.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
                content_blocks.append(f"\n## {text}\n")
            elif elem.name == "li":
                content_blocks.append(f"• {text}")
            elif elem.name in ("th", "td"):
                content_blocks.append(f"| {text} |")
            else:
                content_blocks.append(text)

    # Smart DOM Fallback: If standard headings/paragraphs were sparse (modern SPAs / React / Framer / Webflow)
    total_words_so_far = sum(len(b.split()) for b in content_blocks)
    if total_words_so_far < 40:
        seen_texts = set(b.strip() for b in content_blocks)
        for container in main_container.find_all(["div", "span", "section", "article"]):
            if not container.find(["div", "p", "section", "article", "table", "h1", "h2", "h3", "h4"]):
                txt = container.get_text(separator=" ", strip=True)
                if len(txt) > 20 and txt not in seen_texts:
                    if not any(txt in s or s in txt for s in seen_texts):
                        seen_texts.add(txt)
                        content_blocks.append(txt)

        if next_data_strings:
            content_blocks.append("\n## Application Content & Details\n")
            seen_next = set()
            for s in next_data_strings[:50]:
                if s not in seen_next and s not in seen_texts:
                    seen_next.add(s)
                    content_blocks.append(s)

    if not content_blocks:
        raw_text = main_container.get_text(separator="\n", strip=True)
        if raw_text:
            content_blocks.append(raw_text)

    # 10. Append High-Value Structured Business Facts to Content
    has_facts = (
        entities["phones"]
        or entities["emails"]
        or entities["whatsapp"]
        or entities["addresses"]
        or entities["pricing"]
        or entities["faqs"]
        or entities.get("socials")
        or entities.get("policies")
    )

    if has_facts:
        facts_block: List[str] = ["\n\n## 📌 Verified Business & Contact Facts"]
        if entities["phones"]:
            facts_block.append(f"- **Official Contact Numbers / Helpline:** {', '.join(entities['phones'])}")
        if entities["whatsapp"]:
            facts_block.append(f"- **WhatsApp Support:** {', '.join(entities['whatsapp'])}")
        if entities["emails"]:
            facts_block.append(f"- **Email Inquiries:** {', '.join(entities['emails'])}")
        if entities["addresses"]:
            facts_block.append(f"- **Office / Location Address:** {' | '.join(entities['addresses'])}")
        if entities["opening_hours"]:
            facts_block.append(f"- **Working Hours:** {' | '.join(entities['opening_hours'])}")
        if entities["pricing"]:
            facts_block.append(f"- **Discovered Pricing & Plans:** {', '.join(entities['pricing'])}")
        if entities.get("socials"):
            soc_str = ", ".join(f"{k.capitalize()}: {v}" for k, v in entities["socials"].items())
            facts_block.append(f"- **Official Social Profiles:** {soc_str}")
        if entities.get("policies"):
            pol_str = ", ".join(f"{k.capitalize()} Policy: {v}" for k, v in entities["policies"].items())
            facts_block.append(f"- **Discovered Policies & Legal:** {pol_str}")
        if entities["faqs"]:
            facts_block.append("- **Discovered FAQs:**")
            for f in entities["faqs"][:5]:
                facts_block.append(f"  • Q: {f['question']}\n    A: {f['answer']}")

        content_blocks.append("\n".join(facts_block))

    cleaned_content = "\n".join(content_blocks)
    cleaned_content = re.sub(r"\n{3,}", "\n\n", cleaned_content).strip()

    words = cleaned_content.split()
    word_count = len(words)
    content_hash = hashlib.sha256(cleaned_content.encode("utf-8")).hexdigest()

    return ExtractedPage(
        url=url,
        title=title,
        meta_description=meta_desc,
        content=cleaned_content,
        content_hash=content_hash,
        word_count=word_count,
        discovered_links=discovered_links,
        status="completed" if word_count > 10 else "failed",
        error_message=None if word_count > 10 else "Page did not contain enough readable content.",
        entities=entities,
    )
