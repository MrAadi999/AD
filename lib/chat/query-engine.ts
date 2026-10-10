import { ChatMessage } from './types';

export type QueryIntent =
  | 'PRICING'
  | 'RETURN_OR_REFUND'
  | 'PRODUCT_OR_SERVICE_INFO'
  | 'CONTACT_OR_LOCATION'
  | 'AVAILABILITY_OR_DELIVERY'
  | 'ACTION_REQUEST'
  | 'GREETING_OR_CHITCHAT'
  | 'GENERAL_QUERY';

export interface AnalyzedQuery {
  rawQuery: string;
  rewrittenQuery: string;
  intent: QueryIntent;
  entities: string[];
  isFollowUp: boolean;
  requiresRealtimeAction: boolean;
  language: 'hindi' | 'hinglish' | 'english';
  confidence: number;
}

/**
 * Normalizes colloquial Hinglish / Hindi words into canonical English search terms
 * while preserving the original intent.
 */
function normalizeColloquialTerms(text: string): { normalized: string; detectedLanguage: 'hindi' | 'hinglish' | 'english' } {
  const lower = text.toLowerCase().trim();
  let lang: 'hindi' | 'hinglish' | 'english' = 'english';

  // Devanagari script detection
  if (/[\u0900-\u097F]/.test(text)) {
    lang = 'hindi';
  } else if (/\b(bhai|kya|hai|hain|ka|ki|ke|ko|se|me|mein|kitna|kitne|kab|kahan|kaise|aur|iska|iski|inke|bataye|batao|chahiye|hoga|hogi)\b/i.test(lower)) {
    lang = 'hinglish';
  }

  return { normalized: lower, detectedLanguage: lang };
}

/**
 * Extracts entities mentioned in a message (products, model numbers, IDs, prices)
 */
export function extractEntitiesFromText(text: string): string[] {
  const entities = new Set<string>();

  // 1. Units and ratings: e.g. 9W, 16GB, 5000mAh, 4K, 65W
  const unitMatches = text.match(/\b([0-9]+\s*[A-Za-z]+)\b/g);
  if (unitMatches) {
    for (const u of unitMatches) {
      entities.add(u.trim());
    }
  }

  // 2. Capitalized compound product names: e.g. "XYZ Laptop", "Samsung Galaxy A36", "Pro Plan"
  const titleCaseMatches = text.match(/\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)+)\b/g);
  if (titleCaseMatches) {
    for (const m of titleCaseMatches) {
      const trimmed = m.trim();
      if (!/^(Show Me|Tell Me|Here Is|What About|What Is|Good Morning|Good Evening)\b/i.test(trimmed)) {
        entities.add(trimmed);
      }
    }
  }

  // 2. Model numbers, alphanumeric codes: e.g. A36, Galaxy A36, Pro-10, 9W, 12GB
  const codeMatches = text.match(/\b([A-Z0-9]+-[A-Z0-9]+|[A-Za-z0-9]+\s+[0-9]+[A-Za-z]*|[0-9]+\s*[WwGgMmKk]|Galaxy\s+[A-Za-z0-9]+)\b/gi);
  if (codeMatches) {
    for (const m of codeMatches) {
      const trimmed = m.trim();
      if (!/^(with|for|and|the|here|show|tell)\b/i.test(trimmed)) {
        entities.add(trimmed);
      }
    }
  }

  // 3. Currencies and numerical figures (₹1499, ₹1,499, $20)
  const currencyMatches = text.match(/(?:₹|\$|rs\.?|inr)\s*[0-9,]+(?:\.[0-9]{1,2})?/gi);
  if (currencyMatches) {
    for (const m of currencyMatches) {
      entities.add(m.trim());
    }
  }

  // 4. Quoted strings (e.g. "Pro Plan")
  const quoted = text.match(/["']([^"']+)["']/g);
  if (quoted) {
    for (const q of quoted) {
      entities.add(q.replace(/["']/g, '').trim());
    }
  }

  return Array.from(entities);
}

/**
 * Detects the specific business intent of the user message
 */
export function detectQueryIntent(text: string): { intent: QueryIntent; requiresRealtimeAction: boolean } {
  const lower = text.toLowerCase();

  // 1. Action / Tool Requests (Order tracking, booking appointment)
  if (/(where is my order|track order|order status|mera order kahan hai|book appointment|schedule demo|call me back)\b/i.test(lower)) {
    return { intent: 'ACTION_REQUEST', requiresRealtimeAction: true };
  }

  // 2. Greetings / Chitchat
  if (/^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening)|kaise ho|kya haal|who are you|tum kaun ho)\b/i.test(lower) && lower.length < 35) {
    return { intent: 'GREETING_OR_CHITCHAT', requiresRealtimeAction: false };
  }

  // 3. Return / Refund / Warranty
  if (/(return|refund|exchange|wapsi|paisa wapas|guarantee|warranty|replacement)\b/i.test(lower)) {
    return { intent: 'RETURN_OR_REFUND', requiresRealtimeAction: false };
  }

  // 4. Pricing / Cost / Discount / Fees
  if (/(price|cost|fee|fees|rate|kitne ka|kitna lagega|kitna padega|charge|discount|offer|pricing)\b/i.test(lower)) {
    return { intent: 'PRICING', requiresRealtimeAction: false };
  }

  // 5. Contact / Location / Address / Timings
  if (/(contact|phone|mobile|email|address|location|office|timing|hours|kahan hai|number)\b/i.test(lower)) {
    return { intent: 'CONTACT_OR_LOCATION', requiresRealtimeAction: false };
  }

  // 6. Product / Feature / Specifications / Service Offerings
  if (/(feature|spec|specification|kya kaam|details|service|services|plan|plans|course|kya kya)\b/i.test(lower)) {
    return { intent: 'PRODUCT_OR_SERVICE_INFO', requiresRealtimeAction: false };
  }

  // 7. Stock / Physical Delivery / Shipping
  if (/(in stock|out of stock|shipping|kab tak milega|kitne din lagega|deliver)\b/i.test(lower)) {
    return { intent: 'AVAILABILITY_OR_DELIVERY', requiresRealtimeAction: false };
  }

  return { intent: 'GENERAL_QUERY', requiresRealtimeAction: false };
}

/**
 * Intelligent Conversation-Aware Query Rewriter
 * Resolves pronouns ("it", "its", "iska", "ye", "wahi") and short questions ("price?", "and warranty?")
 * using the prior conversation context.
 */
export function analyzeAndRewriteQuery(params: {
  currentMessage: string;
  history: ChatMessage[];
}): AnalyzedQuery {
  const { currentMessage, history } = params;
  const rawQuery = currentMessage.trim();
  const { detectedLanguage } = normalizeColloquialTerms(rawQuery);
  const { intent, requiresRealtimeAction } = detectQueryIntent(rawQuery);

  let currentEntities = extractEntitiesFromText(rawQuery);
  let isFollowUp = false;
  let rewritten = rawQuery;

  // Check if current query is a short follow-up or has unresolved pronouns
  const isShortFollowUp =
    rawQuery.length < 25 &&
    /^(price|cost|and warranty\??|warranty\??|where\??|how much\??|kitna\??|iska price\??|ye wala\??|aur iska\??|kab tak\??|aur discount\??|available\??)\b/i.test(
      rawQuery
    );

  const hasPronoun = /\b(it|its|this|that|they|them|ye|yeh|iska|iski|inke|woh|wo|unka)\b/i.test(rawQuery);

  // If follow-up or pronoun detected, inspect recent history to extract the active subject entity
  if (isShortFollowUp || hasPronoun || currentEntities.length === 0) {
    let antecedentEntity = '';

    const recentMessages = [...history].slice(-4).reverse();

    // Check user messages first as they define the primary subject/topic
    const userMsgs = recentMessages.filter((m) => m.role === 'user');
    for (const msg of userMsgs) {
      const pastEntities = extractEntitiesFromText(msg.content);
      if (pastEntities.length > 0) {
        antecedentEntity = pastEntities[0];
        isFollowUp = true;
        break;
      }
    }

    // If not found in user messages, check assistant messages
    if (!antecedentEntity) {
      for (const msg of recentMessages) {
        const pastEntities = extractEntitiesFromText(msg.content);
        if (pastEntities.length > 0) {
          antecedentEntity = pastEntities[0];
          isFollowUp = true;
          break;
        }
      }
    }

    if (antecedentEntity) {
      if (!currentEntities.includes(antecedentEntity)) {
        currentEntities.unshift(antecedentEntity);
      }

      // Contextual rewriting
      if (isShortFollowUp) {
        if (intent === 'PRICING') {
          rewritten = `What is the price of ${antecedentEntity}?`;
        } else if (intent === 'RETURN_OR_REFUND') {
          rewritten = `What is the return and refund policy for ${antecedentEntity}?`;
        } else if (intent === 'AVAILABILITY_OR_DELIVERY') {
          rewritten = `Is ${antecedentEntity} currently available and what is the delivery time?`;
        } else {
          rewritten = `${antecedentEntity} ${rawQuery}`;
        }
      } else if (hasPronoun) {
        // Replace pronoun with exact antecedent entity
        rewritten = rawQuery.replace(
          /\b(it|its|this|that|ye|yeh|iska|iski|unka)\b/gi,
          antecedentEntity
        );
      }
    }
  }

  return {
    rawQuery,
    rewrittenQuery: rewritten,
    intent,
    entities: currentEntities,
    isFollowUp,
    requiresRealtimeAction,
    language: detectedLanguage,
    confidence: isFollowUp ? 0.95 : 0.85,
  };
}
