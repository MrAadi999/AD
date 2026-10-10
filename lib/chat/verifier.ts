import { RetrievedChunk } from './types';
import { AnalyzedQuery } from './query-engine';

export type EvidenceStrength = 'STRONG' | 'MEDIUM' | 'WEAK' | 'NONE';

export interface VerificationResult {
  isValid: boolean;
  finalResponse: string;
  evidenceStrength: EvidenceStrength;
  unsupportedClaims: string[];
  correctedNumbers: Array<{ original: string; corrected: string }>;
  zeroGuessTriggered: boolean;
}

/**
 * Extracts specific prices and phone numbers that require strict grounding.
 * Conversational numbers (24/7, percentages, bullet indices) are preserved.
 */
function extractNumbersAndCurrencies(text: string): string[] {
  const prices = text.match(/(?:₹|\$|rs\.?|inr)\s*[0-9,]+(?:\.[0-9]+)?/gi) || [];
  const phones = text.match(/(?:(?:\+91|0091|91|0)[\s-]?)?[6789]\d{4}[\s-]?\d{5}\b/g) || [];
  return [...prices, ...phones].map((m) => m.trim().toLowerCase());
}

/**
 * Evaluates the evidence strength of retrieved chunks against user query
 */
export function evaluateEvidenceStrength(
  chunks: RetrievedChunk[],
  analyzedQuery: AnalyzedQuery
): EvidenceStrength {
  if (!chunks || chunks.length === 0) {
    return 'NONE';
  }

  const topSimilarity = chunks[0]?.similarity || 0;
  const contextCorpus = chunks.map((c) => c.content).join(' ').toLowerCase();

  // If query had specific entities (e.g. "Galaxy A36" or "Pro Plan"), does evidence contain it?
  let entityFound = true;
  if (analyzedQuery.entities.length > 0) {
    entityFound = analyzedQuery.entities.some((e) =>
      contextCorpus.includes(e.toLowerCase())
    );
  }

  if (topSimilarity >= 0.30 && entityFound) {
    return 'STRONG';
  }

  if (topSimilarity >= 0.15) {
    return 'MEDIUM';
  }

  return 'WEAK';
}

/**
 * Generates an honest, unhallucinated zero-guessing fallback
 */
export function generateZeroGuessFallback(params: {
  businessName: string;
  analyzedQuery: AnalyzedQuery;
  language: 'hindi' | 'hinglish' | 'english';
}): string {
  const { businessName, analyzedQuery, language } = params;

  if (language === 'hindi') {
    return `उपलब्ध व्यावसायिक जानकारी में इसके बारे में सत्यापित विवरण मौजूद नहीं है। आप अपना फोन नंबर या ईमेल साझा कर सकते हैं, ${businessName} टीम आपसे संपर्क कर सही जानकारी देगी।`;
  }

  if (language === 'hinglish') {
    return `Ye specific detail abhi hamare business records mein verified nahi hai. Aap apna contact number ya email share kar sakte hain, ${businessName} team aapse turant connect karke confirm details provide kar degi!`;
  }

  return `I don't have verified information about that in our business records yet. Would you like to leave your contact details so our team at ${businessName} can assist you directly?`;
}

/**
 * Strict Post-Generation Fact & Number Verifier
 * Validates that numbers, currencies, and factual claims in the draft answer
 * are strictly grounded in the retrieved evidence chunks.
 */
export function verifyAndCleanResponse(params: {
  draftResponse: string;
  retrievedChunks: RetrievedChunk[];
  analyzedQuery: AnalyzedQuery;
  businessName: string;
}): VerificationResult {
  const { draftResponse, retrievedChunks, analyzedQuery, businessName } = params;
  const evidenceStrength = evaluateEvidenceStrength(retrievedChunks, analyzedQuery);

  // 1. If Intent is business-critical (Pricing, Policies, Specs) and evidence is WEAK or NONE:
  //    Trigger Zero-Guessing mode immediately!
  const isBusinessCritical =
    analyzedQuery.intent === 'PRICING' ||
    analyzedQuery.intent === 'RETURN_OR_REFUND' ||
    analyzedQuery.intent === 'CONTACT_OR_LOCATION';

  if (isBusinessCritical && (evidenceStrength === 'NONE' || evidenceStrength === 'WEAK')) {
    const fallback = generateZeroGuessFallback({
      businessName,
      analyzedQuery,
      language: analyzedQuery.language,
    });

    return {
      isValid: false,
      finalResponse: fallback,
      evidenceStrength,
      unsupportedClaims: ['Critical query asked with insufficient business evidence.'],
      correctedNumbers: [],
      zeroGuessTriggered: true,
    };
  }

  // 2. Numerical Integrity Check: Verify every number in draft appears in evidence
  const rawEvidence = retrievedChunks.map((c) => c.content).join(' ').toLowerCase();
  const normalizedEvidence = rawEvidence.replace(/,/g, '');
  const draftNumbers = extractNumbersAndCurrencies(draftResponse);
  const unsupportedClaims: string[] = [];
  const correctedNumbers: Array<{ original: string; corrected: string }> = [];

  for (const num of draftNumbers) {
    const digitsOnly = num.replace(/[^0-9]/g, '');
    // Ignore trivial single digits like 1, 2, 3 unless they represent prices
    if (digitsOnly.length >= 2) {
      if (!normalizedEvidence.includes(digitsOnly)) {
        unsupportedClaims.push(`Unverified numerical figure: ${num} (digits: ${digitsOnly})`);
      }
    }
  }

  // 3. If draft response contains hallucinated prices or phones for critical queries, suppress or flag
  let finalResponse = draftResponse.trim();
  const isCriticalFactQuery =
    analyzedQuery.intent === 'PRICING' ||
    analyzedQuery.intent === 'CONTACT_OR_LOCATION' ||
    analyzedQuery.intent === 'RETURN_OR_REFUND';

  if (unsupportedClaims.length > 0 && isCriticalFactQuery && evidenceStrength !== 'STRONG') {
    finalResponse = generateZeroGuessFallback({
      businessName,
      analyzedQuery,
      language: analyzedQuery.language,
    });
    return {
      isValid: false,
      finalResponse,
      evidenceStrength,
      unsupportedClaims,
      correctedNumbers,
      zeroGuessTriggered: true,
    };
  }

  return {
    isValid: unsupportedClaims.length === 0,
    finalResponse,
    evidenceStrength,
    unsupportedClaims,
    correctedNumbers,
    zeroGuessTriggered: false,
  };
}
