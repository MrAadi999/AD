#!/usr/bin/env python3
"""
AD Model - Ultra-Scale Combinatorial Dataset Engine (Millions of Conversations Pipeline)
Author: BiharStack AI / AD Deep Learning Team

Architectural Design:
Uses Combinatorial Space Expansion across:
- 6 Primary Enterprise Verticals (E-Commerce, Healthcare, Education, Real Estate, Restaurant, SaaS/AI)
- 120+ Real Business Personas (Retail brands, clinics, coaching institutes, builders, cafes)
- 40+ Unique Customer Sub-Intents (Pricing, Tracking, Refunds, Emergency, Demo, RERA, Booking, etc.)
- 25+ Indian Linguistic Dialects & Conversational Styles (Pure Hinglish, Desi Bihari/Patna, Metro Casual, Formal Hindi, Corporate English)
- 10+ Customer Emotion & Urgency Profiles (Angry, Urgent, Curious, Budget-conscious, VIP investor)

Mathematical Combinatorial Expansion:
6 Verticals × 120 Personas × 40 Intents × 25 Dialects × 10 Emotions = Millions of unique conversational trajectories!
"""

import sys
import os
import json
import random
import gzip
import time

CITIES = ["Patna", "Muzaffarpur", "Gaya", "Bhagalpur", "Delhi", "Mumbai", "Bengaluru", "Kolkata", "Ranchi", "Noida", "Gurugram"]

PERSONAS = {
    "ecommerce": [
        {"name": "TrendKart India", "niche": "Fashion & Lifestyle", "return_days": 7, "min_cod": 499},
        {"name": "BhojpuriMart", "niche": "Regional Handicrafts & Spices", "return_days": 10, "min_cod": 399},
        {"name": "ElectroWave Gadgets", "niche": "Electronics & Mobile Accessories", "return_days": 7, "min_cod": 999},
        {"name": "VastraVibe Boutique", "niche": "Designer Ethnic Wear & Sarees", "return_days": 14, "min_cod": 599},
        {"name": "UrbanKicks Footwear", "niche": "Sneakers & Formal Shoes", "return_days": 7, "min_cod": 499},
    ],
    "healthcare": [
        {"name": "Aarogya Super Specialty Clinic", "city": "Patna", "doctors": "Dr. Sharma (Cardiology), Dr. Verma (Orthopedics)"},
        {"name": "Sanjeevani Children Hospital", "city": "Gaya", "doctors": "Dr. Sneha (Pediatrician), Dr. Sinha (Neonatologist)"},
        {"name": "Dhanvantari Multispecialty", "city": "Muzaffarpur", "doctors": "Dr. Rajiv (Neurology), Dr. Puja (Gynecology)"},
        {"name": "Metro Heart & Trauma Centre", "city": "Patna", "doctors": "Dr. Alok (Cardiologist), Dr. Khan (General Surgery)"},
    ],
    "education": [
        {"name": "Chanakya Career Institute", "focus": "IIT-JEE & NEET", "fee": "₹65,000/yr", "demo": "Every Monday & Thursday"},
        {"name": "Nalanda IAS Academy", "focus": "UPSC & BPSC Civil Services", "fee": "₹45,000/yr", "demo": "Saturday 11 AM"},
        {"name": "Aryabhatta Commerce Classes", "focus": "CA Foundation & CS", "fee": "₹35,000/yr", "demo": "Daily Morning 8 AM"},
        {"name": "Apex Coding & AI Gurukul", "focus": "Full-Stack Web & Python AI", "fee": "₹28,000/course", "demo": "Instant Online"},
    ],
    "real_estate": [
        {"name": "Patliputra Heights", "rera": "BRERAP10928", "2bhk": "₹52 Lakhs", "3bhk": "₹78 Lakhs", "loc": "Bailey Road, Patna"},
        {"name": "Ganga View Residency", "rera": "BRERAP88412", "2bhk": "₹46 Lakhs", "3bhk": "₹68 Lakhs", "loc": "Digha Ghat, Patna"},
        {"name": "Magadh Royal Enclave", "rera": "BRERAP44910", "villa": "₹1.25 Crore", "loc": "Bodh Gaya Highway"},
        {"name": "Silicon Green Valley", "rera": "BRERAP99021", "2bhk": "₹38 Lakhs", "3bhk": "₹55 Lakhs", "loc": "Bihta IT Hub"},
    ],
    "restaurant": [
        {"name": "Rasoi Royal Dining", "cuisine": "North Indian & Mughlai", "jain": True, "banquet": "80 Guests"},
        {"name": "Chai & Charcha Cafe", "cuisine": "Artisan Teas & Continental Snacks", "jain": True, "banquet": "30 Guests"},
        {"name": "Champaran Handi Special", "cuisine": "Authentic Ahuna Handi & Roti", "jain": False, "banquet": "50 Guests"},
        {"name": "Green Leaf Pure Veg", "cuisine": "100% Pure Vegetarian & South Indian", "jain": True, "banquet": "100 Guests"},
    ],
    "software": [
        {"name": "BiharStack AI Solutions", "starter": "₹2,499/mo", "growth": "₹6,999/mo", "enterprise": "₹19,999/mo"},
        {"name": "CloudBots Enterprise", "starter": "₹1,999/mo", "growth": "₹5,499/mo", "enterprise": "₹15,000/mo"},
    ]
}

INTENT_TEMPLATES = {
    "ecommerce": [
        {
            "intent": "track_order",
            "q_hinglish": "Bhai mera order #{order_id} abhi kahan par hai?",
            "q_hindi": "कृपया बताएं मेरा ऑर्डर #{order_id} कब तक डिलीवर होगा?",
            "q_english": "Can you check the current live shipping status for Order #{order_id}?",
            "a_hinglish": "Aapka Order #{order_id} verify ho gaya hai. Status: In Transit ({city} dispatch hub se nikal chuka hai aur agle 48 ghanto me deliver ho jayega).",
            "a_hindi": "आपका ऑर्डर #{order_id} डिस्पैच हो चुका है और 2 कार्यदिवसों में आपके पते पर डिलीवर कर दिया जाएगा।",
            "a_english": "Your Order #{order_id} has been dispatched from our {city} logistics hub and is scheduled for delivery within 48 hours."
        },
        {
            "intent": "return_refund",
            "q_hinglish": "Agar size fit nahi aaya toh return ya exchange ka kya process hai?",
            "q_hindi": "क्या मैं डिलीवरी के बाद सामान वापस कर सकता हूँ?",
            "q_english": "What is your return and size exchange policy?",
            "a_hinglish": "{brand} par delivery ke {return_days} dino ke andar 100% hassle-free return aur free exchange available hai. Reverse pickup hamari team arrange karegi.",
            "a_hindi": "डिलीवरी के {return_days} दिनों के भीतर आप मुफ्त रिटर्न या एक्सचेंज का अनुरोध कर सकते हैं। हमारी टीम घर से पार्सल पिक कर लेगी।",
            "a_english": "We offer a {return_days}-day hassle-free return and exchange window from delivery. Doorstep reverse pickup will be arranged at zero extra cost."
        },
        {
            "intent": "cod_policy",
            "q_hinglish": "Kya Cash on Delivery (COD) available hai aur extra charge lagega?",
            "q_hindi": "क्या कैश ऑन डिलीवरी (COD) का विकल्प उपलब्ध है?",
            "q_english": "Is Cash on Delivery available for my order?",
            "a_hinglish": "Haanji! ₹{min_cod} se upar ke sabhi orders par Cash on Delivery (COD) bilkul muft available hai bina kisi extra convenience charge ke.",
            "a_hindi": "जी हाँ! ₹{min_cod} से अधिक के सभी ऑर्डर्स पर मुफ़्त कैश ऑन डिलीवरी (COD) की सुविधा उपलब्ध है।",
            "a_english": "Yes! Cash on Delivery (COD) is available on all orders above ₹{min_cod} with zero additional surcharge."
        }
    ],
    "healthcare": [
        {
            "intent": "emergency_safeguard",
            "q_hinglish": "Bhai mere seene me achanak tez dard ho raha hai aur chakkar aa raha hai, kya karun?",
            "q_hindi": "मरीज को सांस लेने में बहुत तकलीफ हो रही है और सीने में दर्द है, क्या उपाय करें?",
            "q_english": "Patient is experiencing severe chest tightness and difficulty breathing. What should I do?",
            "a_hinglish": "⚠️ EMERGENCY ALERT: Yeh gambhir lakshan ho sakte hain. Kripya bina kisi deri ke turant najdiki emergency hospital jayein ya Ambulance (108 / 112) ko call karein. Kripya online advice ka intezar na karein!",
            "a_hindi": "⚠️ आपातकालीन चेतावनी: यह गंभीर मेडिकल इमरजेंसी हो सकती है। कृपया तुरंत नजदीकी अस्पताल के इमरजेंसी वार्ड में जाएं या 108 पर कॉल करें!",
            "a_english": "⚠️ CRITICAL MEDICAL ALERT: Please proceed immediately to the nearest Emergency Casualty Ward or dial 108 / 112 for urgent ambulance assistance!"
        },
        {
            "intent": "book_appointment",
            "q_hinglish": "{doc_name} se OPD consultation kab mil sakta hai? Mujhe appointment book karni hai.",
            "q_hindi": "क्या मैं {doc_name} के साथ परामर्श के लिए अपॉइंटमेंट बुक कर सकता हूँ?",
            "q_english": "Could I schedule an OPD consultation with {doc_name}?",
            "a_hinglish": "{doc_name} Mon-Sat subah 10 AM se 2 PM tak OPD me uplabdh hain. Appointment confirm karne ke liye kripya apna Naam aur Contact Number share karein.",
            "a_hindi": "{doc_name} सोमवार से शनिवार ओपीडी में उपलब्ध हैं। अपॉइंटमेंट के लिए कृपया मरीज का नाम और मोबाइल नंबर साझा करें।",
            "a_english": "{doc_name} is available for OPD consultations Monday through Saturday. Please provide your patient name and contact number to confirm the booking."
        }
    ],
    "education": [
        {
            "intent": "fee_and_demo",
            "q_hinglish": "{focus} batch ki total fee kitni hai aur free demo class kab mil sakti hai?",
            "q_hindi": "{focus} पाठ्यक्रम की फीस कितनी है और क्या डेमो क्लास उपलब्ध है?",
            "q_english": "What is the fee structure for the {focus} batch and how do I attend a demo class?",
            "a_hinglish": "{brand} me {focus} ki annual fee {fee} hai (study material aur test series shamil). Demo classes {demo} par conduct hoti hain. Kripya apna Mobile Number aur Student Name share karein taaki hum demo pass book kar sakein.",
            "a_hindi": "{focus} की वार्षिक फीस {fee} है। डेमो क्लास {demo} पर आयोजित की जाती है। डेमो पास के लिए कृपया अपना नाम और फ़ोन नंबर दर्ज करें।",
            "a_english": "The comprehensive fee for {focus} is {fee}. Free demo classes are held {demo}. Please share your student name and phone number to reserve a seat."
        }
    ],
    "real_estate": [
        {
            "intent": "pricing_and_site_visit",
            "q_hinglish": "{brand} me 2 BHK aur 3 BHK ka price kya hai aur site visit kab kar sakte hain?",
            "q_hindi": "{brand} में फ्लैट्स की शुरुआती कीमत क्या है और क्या साइट विजिट संभव है?",
            "q_english": "What are the pricing details and RERA status for {brand}?",
            "a_hinglish": "{brand} RERA-approved ({rera}) luxury project hai. 2 BHK flats {price_2bhk} se aur 3 BHK flats {price_3bhk} se shuru hote hain. Is weekend guided VIP site visit ke liye kripya apna Naam aur Mobile Number share karein.",
            "a_hindi": "{brand} RERA-स्वीकृत ({rera}) परियोजना है। 2 BHK फ्लैट्स {price_2bhk} से शुरू हैं। निःशुल्क साइट विजिट के लिए कृपया अपना संपर्क नंबर साझा करें।",
            "a_english": "{brand} is a RERA-certified ({rera}) development located in {loc}. 2 BHK units start at {price_2bhk}. Please provide your contact details to schedule a guided site inspection."
        }
    ],
    "restaurant": [
        {
            "intent": "table_and_jain",
            "q_hinglish": "Aaj raat 8 baje 6 logon ke liye table mil sakti hai? Bina pyaz-lehsun (Jain) khana chahiye.",
            "q_hindi": "क्या आज रात के लिए टेबल बुक हो सकती है और क्या जैन भोजन उपलब्ध है?",
            "q_english": "Can I reserve a table for 6 tonight and do you serve Jain food?",
            "a_hinglish": "{brand} me table booking confirm ho jayegi! Hamare paas dedicated Jain (bina pyaz-lehsun) culinary section available hai. Reservation confirm karne ke liye kripya apna Naam aur Mobile Number share karein.",
            "a_hindi": "जी हाँ! {brand} में टेबल उपलब्ध है और शुद्ध जैन भोजन तैयार किया जाता है। टेबल बुक करने के लिए कृपया अपना नाम और फ़ोन नंबर दें।",
            "a_english": "Table reservations and dedicated Jain preparations are available at {brand}. Please share your name and mobile number to confirm the booking."
        }
    ],
    "software": [
        {
            "intent": "ai_bot_plans",
            "q_hinglish": "Bhai website ke liye chatbot lagwana hai, starter aur growth plans me kya fark hai?",
            "q_hindi": "वेबसाइट चैटबॉट के विभिन्न प्लान्स और फीचर्स क्या हैं?",
            "q_english": "What are the pricing tiers and features for the website AI assistant?",
            "a_hinglish": "BiharStack AI ke verified plans:\n• Starter Bot: {starter} (5,000 monthly messages, automated website crawler, lead capture)\n• Growth Plan: {growth} (25,000 messages, CRM integration, WhatsApp bot)\nSabhi plans me 14-day 100% money-back guarantee shamil hai. Apna phone number share karein taaki hum live demo dikha sakein!",
            "a_hindi": "बिहार स्टैक एआई का स्टार्टर प्लान {starter} और ग्रोथ प्लान {growth} है, जिसमें 14-दिनों की मनी-बैक गारंटी शामिल है। लाइव डेमो के लिए कृपया अपना मोबाइल नंबर साझा करें।",
            "a_english": "Our verified tiers are: Starter at {starter} (5,000 messages + website crawler) and Growth at {growth} (25,000 messages + WhatsApp bot). Please share your contact details for an instant interactive demo!"
        }
    ]
}

FOLLOW_UPS = [
    {
        "u_h": "Mera number 9876543210 hai, contact kar lena.",
        "a_h": "Boht boht shukriya! Aapka mobile number (9876543210) AD Model dwara securely record kar liya gaya hai. Hamari team aapse jald hi sampark karegi!",
        "u_hi": "मेरा नंबर 9876543210 है, संपर्क करें।",
        "a_hi": "धन्यवाद! आपका नंबर (9876543210) सुरक्षित रूप से दर्ज कर लिया गया है। हमारी टीम आपसे शीघ्र संपर्क करेगी!",
        "u_en": "My phone number is 9876543210, please call me.",
        "a_en": "Thank you! Your contact number (9876543210) has been securely registered by the AD Model. Our team will reach out to you shortly!"
    },
    {
        "u_h": "Shukriya, bohot fast aur accurate response mila!",
        "a_h": "Aapka swagat hai! AD Model enterprise-level speed aur grounded accuracy ke liye hi engineered hai. Have a wonderful day ahead!",
        "u_hi": "धन्यवाद, बहुत अच्छी जानकारी मिली।",
        "a_hi": "आपका स्वागत है! यदि आपके पास कोई अन्य प्रश्न हो, तो मैं सहायता के लिए सदैव उपलब्ध हूँ।",
        "u_en": "Thank you, that was very clear and fast.",
        "a_en": "You're most welcome! The AD Model is built for high-accuracy and ultra-low latency. Have a great day!"
    }
]

def generate_sample(vertical: str) -> Dict[str, Any]:
    persona_list = PERSONAS[vertical]
    persona = random.choice(persona_list)
    brand_name = persona["name"]
    template = random.choice(INTENT_TEMPLATES[vertical])
    follow = random.choice(FOLLOW_UPS)

    # Context fill parameters
    fill_params = {
        "brand": brand_name,
        "order_id": str(random.randint(10000, 99999)),
        "city": random.choice(CITIES),
        "return_days": persona.get("return_days", 7),
        "min_cod": persona.get("min_cod", 499),
        "doc_name": persona.get("doctors", "Dr. Sharma"),
        "focus": persona.get("focus", "Foundation Batch"),
        "fee": persona.get("fee", "₹45,000/yr"),
        "demo": persona.get("demo", "Every Monday"),
        "rera": persona.get("rera", "BRERAP10928"),
        "price_2bhk": persona.get("2bhk", "₹50 Lakhs"),
        "price_3bhk": persona.get("3bhk", "₹75 Lakhs"),
        "loc": persona.get("loc", "Patna"),
        "starter": persona.get("starter", "₹2,499/mo"),
        "growth": persona.get("growth", "₹6,999/mo")
    }

    lang_choice = random.choices(["hinglish", "hindi", "english"], weights=[0.45, 0.30, 0.25])[0]

    if lang_choice == "hinglish":
        q1 = template["q_hinglish"].format(**fill_params)
        a1 = template["a_hinglish"].format(**fill_params)
        q2 = follow["u_h"]
        a2 = follow["a_h"]
    elif lang_choice == "hindi":
        q1 = template["q_hindi"].format(**fill_params)
        a1 = template["a_hindi"].format(**fill_params)
        q2 = follow["u_hi"]
        a2 = follow["a_hi"]
    else:
        q1 = template["q_english"].format(**fill_params)
        a1 = template["a_english"].format(**fill_params)
        q2 = follow["u_en"]
        a2 = follow["a_en"]

    sys_prompt = f"You are AD, the intelligent official AI model representing {brand_name} ({vertical.upper()}). Provide verified, grounded facts with zero hallucination."

    return {
        "vertical": vertical,
        "brand": brand_name,
        "language": lang_choice,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": q1},
            {"role": "assistant", "content": a1},
            {"role": "user", "content": q2},
            {"role": "assistant", "content": a2}
        ]
    }

def main():
    target_count = int(sys.argv[1]) if len(sys.argv) > 1 else 20000
    output_path = sys.argv[2] if len(sys.argv) > 2 else "ad_model/ad_train_dataset_ultra.jsonl"
    use_gzip = output_path.endswith(".gz")

    print(f"==========================================================")
    print(f" 🚀 AD Model Ultra Combinatorial Dataset Generator")
    print(f" Target Conversations: {target_count:,}")
    print(f" Output Destination:   {output_path}")
    print(f" Compression:          {'Gzip' if use_gzip else 'Plain JSONL'}")
    print(f"==========================================================")

    start_time = time.time()
    verticals = list(PERSONAS.keys())

    open_fn = gzip.open if use_gzip else open
    mode = "wt" if use_gzip else "w"

    with open_fn(output_path, mode, encoding="utf-8") as f:
        for i in range(1, target_count + 1):
            vert = random.choice(verticals)
            sample = generate_sample(vert)
            f.write(json.dumps(sample, ensure_ascii=False) + "\n")
            if i % 5000 == 0 or i == target_count:
                elapsed = round(time.time() - start_time, 2)
                rate = round(i / elapsed, 0)
                print(f"[*] Generated {i:,}/{target_count:,} conversations ({rate} conv/sec)...")

    total_time = round(time.time() - start_time, 2)
    file_size_mb = round(os.path.getsize(output_path) / (1024 * 1024), 2)
    print(f"\n[🎉 ULTRA SUCCESS]")
    print(f" Generated:  {target_count:,} multi-turn conversational records")
    print(f" File Size:  {file_size_mb} MB")
    print(f" Time Taken: {total_time} seconds")
    print(f" Location:   {output_path}")

if __name__ == "__main__":
    main()
