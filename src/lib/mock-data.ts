
import { Transcript } from "./store";

export const MOCK_TRANSCRIPTS: Transcript[] = [
  {
    id: '1',
    title: 'Weekly Team Standup',
    date: new Date('2023-11-10T10:00:00').toISOString(),
    duration: 25,
    content: [
      { speaker: 'Sarah (Manager)', text: 'Good morning everyone! Let\'s start with updates from the dev team.', timestamp: '00:00' },
      { speaker: 'Mike (Developer)', text: 'We completed the authentication module yesterday and pushed it to staging.', timestamp: '00:12' },
      { speaker: 'Jessica (UX)', text: 'I\'ve finished the wireframes for the new dashboard. I\'ll share them after the meeting.', timestamp: '00:35' },
      { speaker: 'Sarah (Manager)', text: 'Great progress! Any blockers we should address?', timestamp: '01:02' },
      { speaker: 'Mike (Developer)', text: 'We might need more time for testing the payment integration.', timestamp: '01:18' },
    ]
  },
  {
    id: '2',
    title: 'Client Presentation - Acme Corp',
    date: new Date('2023-11-08T14:30:00').toISOString(),
    duration: 45,
    content: [
      { speaker: 'John (Sales)', text: 'Thank you for joining us today. We\'re excited to show you our solution.', timestamp: '00:00' },
      { speaker: 'Client', text: 'We\'re looking forward to it. Our main concern is scalability.', timestamp: '00:22' },
      { speaker: 'Linda (Product)', text: 'Our platform is built on a microservices architecture that can scale horizontally.', timestamp: '00:40' },
      { speaker: 'Client', text: 'That sounds promising. What about data security?', timestamp: '01:15' },
      { speaker: 'Emma (Security)', text: 'We implement end-to-end encryption and comply with GDPR and CCPA requirements.', timestamp: '01:30' },
    ]
  },
  {
    id: '3',
    title: 'Product Strategy Planning',
    date: new Date('2023-11-05T09:00:00').toISOString(),
    duration: 60,
    content: [
      { speaker: 'Director', text: 'Let\'s discuss our roadmap for Q1 next year.', timestamp: '00:00' },
      { speaker: 'Product Manager', text: 'We should prioritize the AI features we discussed last month.', timestamp: '00:15' },
      { speaker: 'UX Lead', text: 'The user research indicates strong interest in voice commands.', timestamp: '00:45' },
      { speaker: 'CTO', text: 'I agree, but we need to consider the technical challenges.', timestamp: '01:10' },
      { speaker: 'Director', text: 'Let\'s allocate more resources to the AI team then.', timestamp: '01:30' },
    ]
  }
];

export const PRICING_PLANS = [
  {
    name: 'Free',
    price: '$0',
    features: [
      '30 minutes of transcription/month',
      '30 AI queries/month',
      'Basic AI responses',
      'Speaker identification',
      'Timestamps',
      'Meeting summaries'
    ]
  },
  {
    name: 'Premium',
    price: '$9.99/month',
    features: [
      '5+ hours of transcription/month',
      '100+ AI queries/month',
      'Enhanced AI responses',
      'Priority processing',
      'Extended summary generation',
      'Advanced speaker labeling'
    ],
    highlighted: true
  }
];

export const FEATURES = [
  {
    title: 'Real-Time Transcription',
    description: 'Get instant, accurate transcripts of your Google Meet conversations as they happen.'
  },
  {
    title: 'AI Assistant',
    description: 'Ask questions about your meeting, get summaries, or request action items from your conversations.'
  },
  {
    title: 'Speaker Identification',
    description: 'Know who said what with automatic speaker recognition and labeling.'
  },
  {
    title: 'Searchable Transcripts',
    description: 'Quickly find key moments and information within your meeting transcripts.'
  },
  {
    title: 'Meeting Summaries',
    description: 'Receive AI-generated summaries highlighting the main points and action items.'
  },
  {
    title: 'Private & Secure',
    description: 'Your data is encrypted and automatically deleted after 24 hours unless saved.'
  }
];
