export type IndustryType =
  | 'E-commerce'
  | 'Education'
  | 'Healthcare'
  | 'Finance'
  | 'Technology'
  | 'Real Estate'
  | 'Travel'
  | 'Restaurant'
  | 'Agency'
  | 'Other';

export type LanguageType =
  | 'English'
  | 'Hindi'
  | 'Hinglish'
  | 'Bengali'
  | 'Tamil'
  | 'Telugu'
  | 'Marathi'
  | 'Gujarati'
  | 'Other';

export type ToneType =
  | 'Friendly'
  | 'Professional'
  | 'Helpful'
  | 'Casual'
  | 'Formal';

export type ResponseStyleType = 'Concise' | 'Balanced' | 'Detailed';

export type AvatarType = 'upload' | 'initial' | 'default_icon';

export interface LeadFields {
  name: boolean;
  email: boolean;
  phone: boolean;
}

export interface ChatbotConfig {
  id?: string;
  workspace_id?: string;
  name: string;
  description?: string;
  industry: IndustryType;
  language: LanguageType;
  website_url: string;
  website_confirmed: boolean;
  assistant_name: string;
  welcome_message: string;
  tone: ToneType;
  response_style: ResponseStyleType;
  lead_collection_enabled: boolean;
  lead_fields: LeadFields;
  primary_cta: string;
  secondary_cta: string;
  avatar_type: AvatarType;
  avatar_url?: string;
  brand_color: string;
  public_id?: string;
  widget_enabled?: boolean;
  allowed_domains?: string[];
  widget_position?: 'bottom-right' | 'bottom-left';
  widget_theme?: {
    theme?: 'light' | 'dark' | 'auto';
    button_size?: 'normal' | 'large';
  };
  status?: 'draft' | 'active' | 'paused' | 'live';
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_CHATBOT_CONFIG: ChatbotConfig = {
  name: '',
  description: '',
  industry: 'Technology',
  language: 'English',
  website_url: '',
  website_confirmed: false,
  assistant_name: '',
  welcome_message: 'Hi! 👋 How can I help you today?',
  tone: 'Friendly',
  response_style: 'Balanced',
  lead_collection_enabled: true,
  lead_fields: {
    name: true,
    email: true,
    phone: false,
  },
  primary_cta: 'Talk to us',
  secondary_cta: 'Contact support',
  avatar_type: 'default_icon',
  brand_color: '#2563EB',
  widget_enabled: true,
  allowed_domains: [],
  widget_position: 'bottom-right',
  status: 'draft',
};
