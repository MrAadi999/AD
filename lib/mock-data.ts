import { ChatbotItem, MetricItem, ActivityItem, FeatureItem } from '@/types/dashboard';

export const mockChatbots: ChatbotItem[] = [
  {
    id: 'biharstack-demo',
    name: 'BiharStack Demo',
    website: 'https://biharstack.com',
    status: 'Live',
    conversations: 1243,
    leads: 89,
    accuracy: 98,
    avatarColor: 'bg-blue-600',
  },
  {
    id: 'rizqora-support',
    name: 'Rizqora Support Bot',
    website: 'https://rizqora.in',
    status: 'Live',
    conversations: 864,
    leads: 53,
    accuracy: 95,
    avatarColor: 'bg-gradient-to-br from-purple-600 to-indigo-600',
  },
];

export const mockMetrics: MetricItem[] = [
  {
    id: 'metric-1',
    title: 'Total Conversations',
    value: '2,847',
    change: '12%',
    changeType: 'increase',
    periodText: 'vs last 7 days',
    iconName: 'conversations',
  },
  {
    id: 'metric-2',
    title: 'Website Visitors',
    value: '8,921',
    change: '18%',
    changeType: 'increase',
    periodText: 'vs last 7 days',
    iconName: 'visitors',
  },
  {
    id: 'metric-3',
    title: 'Leads Collected',
    value: '142',
    change: '22%',
    changeType: 'increase',
    periodText: 'vs last 7 days',
    iconName: 'leads',
  },
  {
    id: 'metric-4',
    title: 'Avg. Response Time',
    value: '1.2s',
    change: '45%',
    changeType: 'decrease',
    periodText: 'vs last 7 days',
    iconName: 'speed',
  },
];

export const mockActivities: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'New conversation',
    description: 'From biharstack.com',
    timeAgo: '2m ago',
    type: 'conversation',
  },
  {
    id: 'act-2',
    title: 'Lead collected',
    description: 'From rizqora.in',
    timeAgo: '12m ago',
    type: 'lead',
  },
  {
    id: 'act-3',
    title: 'Knowledge base updated',
    description: 'Added 3 new documents',
    timeAgo: '1h ago',
    type: 'kb',
  },
  {
    id: 'act-4',
    title: 'API key created',
    description: 'For project: MyApp',
    timeAgo: '3h ago',
    type: 'api',
  },
];

export const mockFeatures: FeatureItem[] = [
  {
    id: 'feat-1',
    title: 'AI Agents',
    subtitle: 'Sales, Support, Lead',
    iconName: 'users',
  },
  {
    id: 'feat-2',
    title: 'Voice Agent',
    subtitle: 'Voice & Call AI',
    iconName: 'mic',
  },
  {
    id: 'feat-3',
    title: 'WhatsApp Agent',
    subtitle: 'Chat on WhatsApp',
    iconName: 'message-circle',
  },
  {
    id: 'feat-4',
    title: 'API Access',
    subtitle: 'Integrate your app',
    iconName: 'code',
  },
  {
    id: 'feat-5',
    title: 'Analytics',
    subtitle: 'Track performance',
    iconName: 'bar-chart',
  },
  {
    id: 'feat-6',
    title: 'Multi-Language',
    subtitle: 'Global reach',
    iconName: 'globe',
  },
];
