import { buildSystemPrompt } from '../lib/chat/prompt-builder';
import { generateLLMResponse } from '../lib/chat/llm-service';

async function testNaturalChat() {
  const chatbot = {
    id: 'bot-u6fmom6',
    public_id: 'bot-u6fmom6',
    workspace_id: 'ws-demo-01',
    name: 'BiharStack AI',
    assistant_name: 'Aditya (AI Support)',
    description: 'Autonomous Conversational AI platform',
    industry: 'Technology',
    language: 'Hinglish' as const,
    website_url: 'https://biharstack.ai',
    website_confirmed: true,
    welcome_message: 'Namaste! Main BiharStack AI ka official assistant hoon.',
    tone: 'Friendly' as const,
    response_style: 'Balanced' as const,
    lead_collection_enabled: true,
    lead_fields: { name: true, phone: true, email: true },
    primary_cta: 'Talk to sales',
    secondary_cta: 'Request demo',
    avatar_type: 'default_icon' as const,
    brand_color: '#2563EB',
    widget_enabled: true,
    allowed_domains: [],
    widget_position: 'bottom-right' as const,
    status: 'active' as const,
    created_at: new Date().toISOString()
  };

  const contextText = `
BiharStack AI Official Contact Information:
Phone / Helpline: +91 98765 43210 / +91 91234 56789
Support Email: support@biharstack.ai
Office: Kankarbagh Main Road, Patna, Bihar, PIN: 800020
Working Hours: Monday to Saturday 9:00 AM to 7:00 PM IST

Pricing Plans:
Starter Plan: ₹1,999/month for small businesses (up to 2,000 chats)
Growth Plan: ₹4,999/month for scaling startups (up to 10,000 chats)
Enterprise Plan: Custom pricing from ₹14,999/month with dedicated support

Policies:
100% money-back refund guarantee within 14 days of purchase.
End-to-end data encryption with SOC2 compliance.
`;

  const systemPrompt = buildSystemPrompt(chatbot as any, contextText);

  const queries = [
    'good morning',
    'give me phone number',
    'kya refund policy hai?',
    'pricing kya hai?',
    'tum kaun ho?'
  ];

  for (const q of queries) {
    const res = await generateLLMResponse({
      systemPrompt,
      messages: [{ role: 'user', content: q }],
      contextText
    });
    console.log(`\n========================================`);
    console.log(`USER: "${q}"`);
    console.log(`AI BOT:\n${res.text}`);
  }
}

testNaturalChat().catch(console.error);
