/**
 * BiharStack AI - Intelligent Business Knowledge Synthesizer
 * Aggregates and distills critical business entities (phones, emails, whatsapp,
 * physical address, pricing tiers, refund/privacy policies, FAQs) from all crawled pages
 * and synthesizes an authoritative Master Business Profile document.
 */
import * as crypto from 'crypto';
import { KnowledgeSource } from '../crawler/types';
import { addOrUpdateKnowledgeSource } from '../crawler/runner';
import { processKnowledgeSource } from './processor';

export interface DiscoveredBusinessEntities {
  phones: string[];
  emails: string[];
  whatsapp: string[];
  addresses: string[];
  opening_hours: string[];
  pricing: string[];
  faqs: Array<{ question: string; answer: string }>;
  policies: string[];
  organizationName?: string;
  tagline?: string;
}

/**
 * Mine and synthesize all critical business data from crawled pages
 */
export async function synthesizeMasterBusinessProfile(
  workspaceId: string,
  chatbotId: string,
  websiteUrl: string,
  pages: any[]
): Promise<{
  masterSource: KnowledgeSource;
  entities: DiscoveredBusinessEntities;
}> {
  const aggregated: DiscoveredBusinessEntities = {
    phones: [],
    emails: [],
    whatsapp: [],
    addresses: [],
    opening_hours: [],
    pricing: [],
    faqs: [],
    policies: [],
    organizationName: '',
  };

  const combinedFullText = pages.map((p) => p.content || '').join('\n\n');

  // 1. Gather entities emitted from crawler
  for (const page of pages) {
    const ent = page.entities || {};
    if (Array.isArray(ent.phones)) aggregated.phones.push(...ent.phones);
    if (Array.isArray(ent.emails)) aggregated.emails.push(...ent.emails);
    if (Array.isArray(ent.whatsapp)) aggregated.whatsapp.push(...ent.whatsapp);
    if (Array.isArray(ent.addresses)) aggregated.addresses.push(...ent.addresses);
    if (Array.isArray(ent.opening_hours)) aggregated.opening_hours.push(...ent.opening_hours);
    if (Array.isArray(ent.pricing)) aggregated.pricing.push(...ent.pricing);
    if (Array.isArray(ent.faqs)) aggregated.faqs.push(...ent.faqs);
    if (ent.organization?.name && !aggregated.organizationName) {
      aggregated.organizationName = ent.organization.name;
    }
  }

  // 2. Extra regex pass over combined full text
  // Global & Indian Phone Numbers
  const phoneRegexes = [
    /(?:(?:\+91|0091|91|0)[\s-]?)?[6789]\d{4}[\s-]?\d{5}\b|1800[\s-]?\d{3}[\s-]?\d{3,4}\b/g,
    /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g,
  ];
  for (const pr of phoneRegexes) {
    const matches = combinedFullText.match(pr) || [];
    for (const p of matches) {
      const cleanDigits = p.replace(/\D/g, '');
      if (cleanDigits.length >= 8 && cleanDigits.length <= 15 && !p.match(/^(19|20)\d{2}$/)) {
        aggregated.phones.push(p.trim());
      }
    }
  }

  // Emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const foundEmails = combinedFullText.match(emailRegex) || [];
  for (const em of foundEmails) {
    const lower = em.toLowerCase();
    if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.svg') && !lower.includes('schema.org') && !lower.includes('example.com') && !lower.includes('sentry.io')) {
      aggregated.emails.push(em.trim());
    }
  }

  // Pricing mentions across all global currencies (₹ / $ / € / £ / AED / CAD / AUD / JPY / INR)
  const priceRegex = /(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP|C\$|A\$|AED|¥)\s*\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:\/|per)\s*(?:month|mo|year|yr|annum|day|hour|seat|user|chat|project|license|item))?/gi;
  const foundPrices = combinedFullText.match(priceRegex) || [];
  for (const pr of foundPrices) {
    const cleanPr = pr.trim();
    // Exclude Next.js RSC references like $17, $18 without period or word context
    if (!/^\$(1[0-9]|2[0-9]|[0-9])$/.test(cleanPr)) {
      aggregated.pricing.push(cleanPr);
    }
  }

  // Policies detection (Refund, Return, Privacy, SLA, Terms)
  const policyLines = combinedFullText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) =>
      /(?:refund|money[\s-]back|guarantee|cancellation|privacy policy|return policy|sla|uptime|warranty|terms of service)/i.test(l) &&
      l.length > 20 &&
      l.length < 250
    );
  aggregated.policies.push(...policyLines);

  // 3. Deduplicate
  aggregated.phones = Array.from(new Set(aggregated.phones.map((p) => p.replace(/\s+/g, ' ').trim()))).slice(0, 10);
  aggregated.emails = Array.from(new Set(aggregated.emails.map((e) => e.toLowerCase().trim()))).slice(0, 10);
  aggregated.whatsapp = Array.from(new Set(aggregated.whatsapp.map((w) => w.trim()))).slice(0, 5);
  aggregated.addresses = Array.from(new Set(aggregated.addresses.map((a) => a.replace(/\s+/g, ' ').trim()))).slice(0, 5);
  aggregated.opening_hours = Array.from(new Set(aggregated.opening_hours.map((h) => h.trim()))).slice(0, 5);
  aggregated.pricing = Array.from(new Set(aggregated.pricing)).slice(0, 15);
  aggregated.policies = Array.from(new Set(aggregated.policies)).slice(0, 8);

  const seenQ = new Set<string>();
  aggregated.faqs = aggregated.faqs.filter((f) => {
    if (!f.question || seenQ.has(f.question.toLowerCase())) return false;
    seenQ.add(f.question.toLowerCase());
    return true;
  }).slice(0, 20);

  // 4. Construct high-density Master Knowledge Profile Document
  const docLines: string[] = [
    `# ⭐ Master Business Knowledge & Verified Facts Profile`,
    `Website: ${websiteUrl}`,
    `Generated at: ${new Date().toISOString()}`,
    `Purpose: Authoritative, ground-truth business facts for AI customer support and lead assistance.\n`,
  ];

  if (aggregated.organizationName) {
    docLines.push(`## 🏢 Company / Organization`);
    docLines.push(`Name: ${aggregated.organizationName}\n`);
  }

  // Contacts
  docLines.push(`## 📞 Official Contact & Communication Channels`);
  if (aggregated.phones.length > 0) {
    docLines.push(`- Phone / Helpline Numbers: ${aggregated.phones.join(', ')}`);
  }
  if (aggregated.whatsapp.length > 0) {
    docLines.push(`- WhatsApp Support: ${aggregated.whatsapp.join(', ')}`);
  }
  if (aggregated.emails.length > 0) {
    docLines.push(`- Official Support / Sales Email: ${aggregated.emails.join(', ')}`);
  }
  if (aggregated.phones.length === 0 && aggregated.emails.length === 0) {
    docLines.push(`- Customers can request a callback by sharing their contact number or email directly with the assistant.`);
  }
  docLines.push('');

  // Office Location
  if (aggregated.addresses.length > 0 || aggregated.opening_hours.length > 0) {
    docLines.push(`## 📍 Office Location & Working Timings`);
    if (aggregated.addresses.length > 0) {
      docLines.push(`- Physical Address: ${aggregated.addresses.join(' | ')}`);
    }
    if (aggregated.opening_hours.length > 0) {
      docLines.push(`- Operating Hours: ${aggregated.opening_hours.join(' | ')}`);
    }
    docLines.push('');
  }

  // Pricing & Offerings
  if (aggregated.pricing.length > 0) {
    docLines.push(`## 💳 Pricing Plans & Commercial Offerings`);
    for (const pr of aggregated.pricing) {
      docLines.push(`- ${pr}`);
    }
    docLines.push('');
  }

  // Policies
  if (aggregated.policies.length > 0) {
    docLines.push(`## 🛡️ Business Policies & Guarantees`);
    for (const pol of aggregated.policies) {
      docLines.push(`- ${pol}`);
    }
    docLines.push('');
  }

  // FAQs
  if (aggregated.faqs.length > 0) {
    docLines.push(`## ❓ Key Frequently Asked Questions (FAQs)`);
    for (const faq of aggregated.faqs) {
      docLines.push(`### Q: ${faq.question}`);
      docLines.push(`A: ${faq.answer}\n`);
    }
  }

  const masterContent = docLines.join('\n');
  const contentHash = crypto.createHash('sha256').update(masterContent).digest('hex');
  const wordCount = masterContent.split(/\s+/).filter(Boolean).length;
  const now = new Date().toISOString();

  const masterSource: KnowledgeSource = {
    id: `src-master-${chatbotId.replace(/[^a-zA-Z0-9]/g, '')}`,
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    source_type: 'document',
    url: `${websiteUrl.replace(/\/$/, '')}/#verified-business-profile`,
    title: '⭐ Master Business Profile & Verified Facts',
    content: masterContent,
    content_hash: contentHash,
    status: 'completed',
    word_count: wordCount,
    crawled_at: now,
    created_at: now,
    updated_at: now,
  };

  // Save and process into vectors
  await addOrUpdateKnowledgeSource(workspaceId, chatbotId, masterSource);
  await processKnowledgeSource(workspaceId, chatbotId, masterSource);

  return {
    masterSource,
    entities: aggregated,
  };
}
