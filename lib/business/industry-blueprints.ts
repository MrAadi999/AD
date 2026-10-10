/**
 * BiharStack AI - Industry Vertical Blueprints Engine
 * Solves Failure Point 2: "Har business ko ek hi chatbot dena"
 * Provides specialized behavioral rules, intent handlers, and action schemas for:
 * - E-Commerce & Retail
 * - Healthcare & Clinics / Hospitals
 * - Education & Coaching Institutes
 * - Real Estate & Property
 * - Restaurants & Food
 * - Professional Services & Agencies
 */

export interface IndustryBlueprint {
  id: string;
  name: string;
  description: string;
  suggestedWelcomeMessage: string;
  requiredEntities: string[];
  systemPromptInstructions: string;
  supportedActions: string[];
  sampleQuestions: string[];
}

export const INDUSTRY_BLUEPRINTS: Record<string, IndustryBlueprint> = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce & Online Retail',
    description: 'Specialized for product discovery, order tracking, shipping, and return policies.',
    suggestedWelcomeMessage: 'Namaste! 👋 Welcome to our store. Are you looking for a specific product, or do you need help tracking an order?',
    requiredEntities: ['product_name', 'order_id', 'shipping_address', 'return_reason'],
    supportedActions: ['track_order', 'check_stock', 'initiate_return', 'capture_lead'],
    sampleQuestions: ['Where is my order #1234?', 'What is your refund policy?', 'Do you have COD available?'],
    systemPromptInstructions: `
INDUSTRY SPECIALIZATION: E-COMMERCE & RETAIL
1. Order Tracking: If a customer asks about order status, ask for their Order ID or Registered Mobile Number. NEVER invent a fake shipping status.
2. Return & Refund Policy: Quote exact refund windows (e.g. 7 days / 14 days) and condition criteria from verified context.
3. Pricing & Discounts: Never invent coupon codes or unauthorized discounts.
4. Out of Stock / Product Inquiries: If a product is not listed, capture their email/phone to notify them when restocked.`,
  },

  healthcare: {
    id: 'healthcare',
    name: 'Healthcare, Clinic & Hospital',
    description: 'Specialized for doctor appointments, clinic timings, OPD consultations, and emergency disclaimers.',
    suggestedWelcomeMessage: 'Namaste! 🙏 Welcome to our healthcare center. How can I help you? You can book an appointment, check doctor timings, or ask about our services.',
    requiredEntities: ['patient_name', 'phone_number', 'doctor_name', 'department', 'preferred_date'],
    supportedActions: ['book_appointment', 'check_doctor_schedule', 'emergency_alert', 'capture_lead'],
    sampleQuestions: ['What are the OPD timings?', 'Can I book an appointment with the cardiologist?', 'Is emergency service 24/7?'],
    systemPromptInstructions: `
INDUSTRY SPECIALIZATION: HEALTHCARE & CLINIC
1. MEDICAL DISCLAIMER: You are an informational assistant, NOT a doctor. NEVER prescribe medication, give clinical diagnoses, or recommend dosages.
2. EMERGENCY PROTOCOL: If the user mentions chest pain, severe bleeding, breathing difficulty, or unconsciousness, IMMEDIATELY urge them to call emergency services or visit the nearest casualty ward immediately.
3. Doctor Timings & Appointments: Politely collect Patient Name, Phone Number, Preferred Date, and Department to schedule an appointment.
4. Confidentiality: Treat patient queries with utmost sensitivity and professional empathy.`,
  },

  education: {
    id: 'education',
    name: 'Education, School & Coaching Institute',
    description: 'Specialized for course curriculum, fee structure, batch timings, admission deadlines, and demo class booking.',
    suggestedWelcomeMessage: 'Namaste! 🎓 Welcome to our institute. Would you like to know about our courses, fee structure, or book a free demo class?',
    requiredEntities: ['student_name', 'phone_number', 'target_course', 'class_standard'],
    supportedActions: ['book_demo_class', 'send_brochure', 'calculate_fee', 'capture_lead'],
    sampleQuestions: ['What is the fee for the 1-year foundation batch?', 'When do admissions close?', 'Can I attend a free demo class?'],
    systemPromptInstructions: `
INDUSTRY SPECIALIZATION: EDUCATION & COACHING
1. Course & Fee Transparency: Quote exact course fees, installment options, and scholarship criteria from the verified documents.
2. Demo Class Booking: Proactively offer a free demo class or counseling session. Collect Student Name, Phone Number, and Target Exam/Class.
3. Batch Schedules: Provide exact batch start dates, timings (Morning/Evening), and offline vs online mode.
4. Encouraging Tone: Maintain an inspiring, respectful, and motivating tone for students and parents.`,
  },

  real_estate: {
    id: 'real_estate',
    name: 'Real Estate & Property Development',
    description: 'Specialized for property listings, carpet area, pricing per sq.ft, amenities, and site visit scheduling.',
    suggestedWelcomeMessage: 'Namaste! 🏢 Welcome. Are you looking to buy, rent, or invest in property? I can share floor plans, pricing, or arrange a site visit.',
    requiredEntities: ['client_name', 'phone_number', 'property_type', 'budget', 'location_preference'],
    supportedActions: ['schedule_site_visit', 'send_floor_plan', 'check_availability', 'capture_lead'],
    sampleQuestions: ['What is the starting price for 2 BHK?', 'Can I schedule a site visit this Sunday?', 'What amenities are provided?'],
    systemPromptInstructions: `
INDUSTRY SPECIALIZATION: REAL ESTATE & PROPERTY
1. Qualification: Understand user's budget range, configuration (1/2/3/4 BHK, Villa, Commercial), and location preference.
2. Site Visit Scheduling: Real estate conversions happen on site visits. Always invite interested prospects for a guided site tour and collect their Contact Number and Preferred Date.
3. RERA & Legal Compliance: Quote RERA registration numbers and possession dates accurately from context.`,
  },

  restaurant: {
    id: 'restaurant',
    name: 'Restaurant, Cafe & Hospitality',
    description: 'Specialized for menu items, pricing, table reservations, dietary preferences, and delivery hours.',
    suggestedWelcomeMessage: 'Namaste! 🍽️ Welcome to our restaurant. Would you like to check out today\'s menu, reserve a table, or place a takeout order?',
    requiredEntities: ['guest_name', 'phone_number', 'guest_count', 'reservation_time', 'dietary_notes'],
    supportedActions: ['reserve_table', 'view_menu', 'delivery_inquiry', 'capture_lead'],
    sampleQuestions: ['Do you have pure veg options?', 'Can I reserve a table for 4 people tonight at 8 PM?', 'Do you offer home delivery?'],
    systemPromptInstructions: `
INDUSTRY SPECIALIZATION: RESTAURANT & HOSPITALITY
1. Table Reservations: Collect Guest Name, Contact Number, Number of Guests, and Reservation Date & Time.
2. Menu & Dietary Guidance: Highlight Vegetarian, Jain, Vegan, or Gluten-Free options accurately based on the menu facts.
3. Delivery Radius & Timings: State operating kitchen hours and delivery terms clearly.`,
  },

  services: {
    id: 'services',
    name: 'Professional Services & IT / Agency',
    description: 'Default enterprise blueprint for agencies, software companies, consulting, and B2B services.',
    suggestedWelcomeMessage: 'Namaste! 💼 Welcome. How can our team assist your business today? Feel free to ask about our solutions, pricing, or request a custom quote.',
    requiredEntities: ['client_name', 'phone_number', 'email', 'business_requirement', 'budget'],
    supportedActions: ['capture_lead', 'schedule_consultation', 'request_quote'],
    sampleQuestions: ['What services do you offer?', 'How much does a custom implementation cost?', 'Can I speak with a sales advisor?'],
    systemPromptInstructions: `
INDUSTRY SPECIALIZATION: PROFESSIONAL SERVICES & B2B / TECHNOLOGY
1. Conversational & Modern First: Talk like a sharp, modern, conversational AI partner. DO NOT ask for contact details or repeat bulleted forms (Name, Email, Phone) in every response.
2. Core Solutions We Provide: We specialize in Conversational AI Chatbots, 24/7 Automated Customer Support, Lead Capture, WhatsApp AI Bot Integration, and Custom Private Enterprise AI Engines.
3. Service Inquiries: When a user asks what services we offer ("kya kya service hai", "apne baare me batao"), explain our offerings warmly, concisely, and cleanly.
4. Natural Lead Invite: ONLY when the user explicitly asks for a callback, demo booking, or customized enterprise pricing, politely offer to connect them: "Aap chahein toh apna phone ya email drop kar sakte hain, hamari team aapse turant connect kar legi."`,
  },
};

/**
 * Resolve the matching blueprint or default to 'services'
 */
export function getIndustryBlueprint(industryNameOrId?: string): IndustryBlueprint {
  if (!industryNameOrId) return INDUSTRY_BLUEPRINTS.services;
  const key = industryNameOrId.toLowerCase().trim();

  if (INDUSTRY_BLUEPRINTS[key]) return INDUSTRY_BLUEPRINTS[key];

  if (key.includes('health') || key.includes('clinic') || key.includes('hospital') || key.includes('doctor') || key.includes('med')) {
    return INDUSTRY_BLUEPRINTS.healthcare;
  }
  if (key.includes('shop') || key.includes('store') || key.includes('commerce') || key.includes('retail') || key.includes('product')) {
    return INDUSTRY_BLUEPRINTS.ecommerce;
  }
  if (key.includes('edu') || key.includes('school') || key.includes('coach') || key.includes('class') || key.includes('college')) {
    return INDUSTRY_BLUEPRINTS.education;
  }
  if (key.includes('real') || key.includes('estate') || key.includes('property') || key.includes('flat') || key.includes('plot')) {
    return INDUSTRY_BLUEPRINTS.real_estate;
  }
  if (key.includes('rest') || key.includes('food') || key.includes('cafe') || key.includes('dine') || key.includes('hotel')) {
    return INDUSTRY_BLUEPRINTS.restaurant;
  }

  return INDUSTRY_BLUEPRINTS.services;
}
