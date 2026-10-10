import { ChatbotConfig } from './types';

export const validateUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { isValid: false, error: 'Website URL is required.' };
  }

  const trimmed = url.trim();

  // URL must start with http:// or https://
  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      isValid: false,
      error: 'URL must start with https:// (e.g. https://example.com)',
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return {
        isValid: false,
        error: 'Please enter a valid domain name (e.g. https://example.com)',
      };
    }

    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
    if (!domainRegex.test(parsed.hostname)) {
      return {
        isValid: false,
        error: 'Invalid domain name format. Example: https://example.com',
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format. Example: https://example.com',
    };
  }
};

export const validateStep1 = (
  config: Partial<ChatbotConfig>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!config.name || config.name.trim().length < 2) {
    errors.name = 'Bot name is required (at least 2 characters).';
  } else if (config.name.trim().length > 60) {
    errors.name = 'Bot name must be under 60 characters.';
  }

  if (!config.industry) {
    errors.industry = 'Please select an industry.';
  }

  if (!config.language) {
    errors.language = 'Please select a primary language.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateStep2 = (
  config: Partial<ChatbotConfig>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  const urlCheck = validateUrl(config.website_url || '');
  if (!urlCheck.isValid) {
    errors.website_url = urlCheck.error || 'Invalid URL';
  }

  if (!config.website_confirmed) {
    errors.website_confirmed =
      'You must confirm ownership or permission to connect this website.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateStep3 = (
  config: Partial<ChatbotConfig>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!config.welcome_message || config.welcome_message.trim().length === 0) {
    errors.welcome_message = 'Welcome message is required.';
  }

  if (config.brand_color && !/^#([0-9A-Fa-f]{3}){1,2}$/.test(config.brand_color)) {
    errors.brand_color = 'Please provide a valid hex color code (e.g. #2563EB).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
