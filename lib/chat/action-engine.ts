import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';

export interface ActionExecutionResult {
  hasAction: boolean;
  actionName?: 'track_order' | 'book_appointment' | 'capture_lead' | 'escalate_human';
  directResponse?: string;
  actionData?: Record<string, any>;
}

export interface CapturedLead {
  id: string;
  workspaceId: string;
  chatbotId: string;
  name?: string;
  phone?: string;
  email?: string;
  requirement?: string;
  channel: string;
  timestamp: string;
}

/**
 * Extract phone number (Indian 10-digit, 1800, or with +91)
 */
function extractPhoneNumber(text: string): string | null {
  const match = text.match(/(?:(?:\+91|0091|91|0)[\s-]?)?[6789]\d{4}[\s-]?\d{5}\b|1800[\s-]?\d{3}[\s-]?\d{3,4}\b/);
  return match ? match[0].replace(/[\s-]/g, '') : null;
}

/**
 * Extract email address
 */
function extractEmail(text: string): string | null {
  const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  return match ? match[0].trim() : null;
}

/**
 * Extract Order ID (e.g., #12345, ORD-9876)
 */
function extractOrderId(text: string): string | null {
  const match = text.match(/(?:order\s*(?:id|no|number|#)?\s*[:#-]?\s*|#)([A-Za-z0-9-]{4,16})\b/i) ||
                text.match(/\b(ORD[-_]?[0-9]{4,10})\b/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract name if explicitly provided (e.g. "My name is John" or "I am Rahul")
 */
function extractName(text: string): string | null {
  const match = text.match(/(?:my name is|i am|name:)\s+([A-Za-z]{2,25}(?:\s+[A-Za-z]{2,25})?)/i);
  return match ? match[1].trim() : null;
}

/**
 * Persist captured lead to database
 */
async function persistLead(lead: CapturedLead): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase.from('leads').insert({
        workspace_id: lead.workspaceId,
        chatbot_id: lead.chatbotId,
        name: lead.name || null,
        phone: lead.phone || null,
        email: lead.email || null,
        notes: lead.requirement || null,
        status: 'new',
        created_at: lead.timestamp,
      });
    } catch (err: any) {
      console.warn('[ActionEngine] Database lead insert warning:', err.message);
    }
  }
}

/**
 * Call real business webhook if configured
 */
async function callBusinessWebhook(
  webhookUrl: string,
  payload: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Chatbot-ActionEngine/1.0',
      },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { success: false, error: `Webhook responded with status ${res.status}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Detect and execute business action.
 * Strict rules:
 * - NO fake order tracking or fake booking confirmations.
 * - Only answer order/booking status from a real business webhook.
 * - If none is configured: capture lead (name, phone) and tell user the team will contact them.
 */
export async function detectAndExecuteAction(params: {
  workspaceId: string;
  chatbotId: string;
  userMessage: string;
  industry?: string;
  businessName?: string;
  webhookUrl?: string;
}): Promise<ActionExecutionResult> {
  const {
    workspaceId,
    chatbotId,
    userMessage,
    businessName = 'Our team',
    webhookUrl = process.env.BUSINESS_WEBHOOK_URL,
  } = params;
  const lowerMsg = userMessage.toLowerCase().trim();

  const phone = extractPhoneNumber(userMessage);
  const email = extractEmail(userMessage);
  const name = extractName(userMessage);

  // If contact info is shared in message, record it as a lead
  if (phone || email) {
    const lead: CapturedLead = {
      id: crypto.randomUUID(),
      workspaceId,
      chatbotId,
      name: name || undefined,
      phone: phone || undefined,
      email: email || undefined,
      requirement: userMessage,
      channel: 'web_widget',
      timestamp: new Date().toISOString(),
    };
    await persistLead(lead);

    if (userMessage.length < 40 && (phone || email)) {
      return {
        hasAction: true,
        actionName: 'capture_lead',
        directResponse: `Thank you! We have received your contact details (${phone || email}). A representative from ${businessName} will contact you shortly. How else may I assist you?`,
        actionData: lead,
      };
    }
  }

  // 1. ORDER TRACKING ACTION
  const isOrderQuery =
    lowerMsg.includes('order') ||
    lowerMsg.includes('mera order') ||
    lowerMsg.includes('parcel') ||
    lowerMsg.includes('delivery status') ||
    lowerMsg.includes('track order');

  if (isOrderQuery) {
    const orderId = extractOrderId(userMessage);

    // If real webhook is configured, query it
    if (webhookUrl && orderId) {
      const webhookRes = await callBusinessWebhook(webhookUrl, {
        action: 'track_order',
        orderId,
        phone,
        chatbotId,
        workspaceId,
      });

      if (webhookRes.success && webhookRes.data?.status) {
        return {
          hasAction: true,
          actionName: 'track_order',
          directResponse: `Order #${orderId} Status: ${webhookRes.data.status}${webhookRes.data.estimatedDelivery ? ` (Estimated Delivery: ${webhookRes.data.estimatedDelivery})` : ''}`,
          actionData: webhookRes.data,
        };
      }
    }

    // No webhook configured or webhook failed: capture lead, do NOT fake tracking
    if (phone || email) {
      return {
        hasAction: true,
        actionName: 'track_order',
        directResponse: `We have received your order inquiry${orderId ? ` for Order #${orderId}` : ''}. Our support team will verify your order details and contact you directly at ${phone || email}.`,
        actionData: { orderId, phone, email },
      };
    }

    return {
      hasAction: true,
      actionName: 'track_order',
      directResponse: `To look up your order status, please provide your **Order ID** along with your **Name** and **Phone Number**. Our team will verify your records and get back to you directly.`,
    };
  }

  // 2. APPOINTMENT / BOOKING ACTION
  const isBookingQuery =
    lowerMsg.includes('book appointment') ||
    lowerMsg.includes('appointment lena') ||
    lowerMsg.includes('book demo') ||
    lowerMsg.includes('schedule a call') ||
    lowerMsg.includes('site visit') ||
    lowerMsg.includes('table book') ||
    lowerMsg.includes('reserve table') ||
    lowerMsg.includes('schedule meeting');

  if (isBookingQuery) {
    // If real webhook is configured, query it
    if (webhookUrl && (phone || email)) {
      const webhookRes = await callBusinessWebhook(webhookUrl, {
        action: 'book_appointment',
        name,
        phone,
        email,
        details: userMessage,
        chatbotId,
        workspaceId,
      });

      if (webhookRes.success && webhookRes.data?.confirmationId) {
        return {
          hasAction: true,
          actionName: 'book_appointment',
          directResponse: `Your booking request has been submitted to ${businessName} (Ref: ${webhookRes.data.confirmationId}). A representative will contact you at ${phone || email} to confirm your appointment time.`,
          actionData: webhookRes.data,
        };
      }
    }

    // No webhook configured: capture lead, do NOT fake confirmation
    if (phone || email) {
      return {
        hasAction: true,
        actionName: 'book_appointment',
        directResponse: `Thank you! Your booking request has been forwarded to ${businessName}. Our team will review available slots and contact you directly at ${phone || email} to schedule your appointment.`,
        actionData: { phone, email, name },
      };
    }

    return {
      hasAction: true,
      actionName: 'book_appointment',
      directResponse: `To schedule an appointment or demo with ${businessName}, please share your **Name** and **Phone Number**. Our team will reach out to confirm your slot.`,
    };
  }

  // 3. HUMAN ESCALATION ACTION
  const isEscalation =
    lowerMsg.includes('talk to human') ||
    lowerMsg.includes('human agent') ||
    lowerMsg.includes('real person') ||
    lowerMsg.includes('customer care') ||
    lowerMsg.includes('speak with someone') ||
    lowerMsg.includes('complaint');

  if (isEscalation) {
    if (phone || email) {
      return {
        hasAction: true,
        actionName: 'escalate_human',
        directResponse: `Your request has been escalated to our team. A representative will reach out to you directly at ${phone || email} as soon as possible.`,
        actionData: { escalation: true, phone, email },
      };
    }

    return {
      hasAction: true,
      actionName: 'escalate_human',
      directResponse: `To connect with a team member, please share your **Name** and **Phone Number** or **Email**. Someone from our team will contact you directly.`,
      actionData: { escalation: true },
    };
  }

  return { hasAction: false };
}
