export interface ChatbotItem {
  id: string;
  name: string;
  website: string;
  status: 'Live' | 'Draft' | 'Paused';
  conversations: number;
  leads: number;
  accuracy: number;
  avatarColor: string;
}

export interface MetricItem {
  id: string;
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  periodText: string;
  iconName: 'conversations' | 'visitors' | 'leads' | 'speed';
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: 'conversation' | 'lead' | 'kb' | 'api';
}

export interface FeatureItem {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
}
