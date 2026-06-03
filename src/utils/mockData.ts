export interface TeamMember {
  id: string;
  name: string;
  role: string;
  emoji: string;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

export interface ActionItem {
  id: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  createdInRetro: string;
}

export interface RetroSession {
  id: string;
  teamId: string;
  date: string;
  phase: number;
  gameScores: Record<string, number>;
  icebreakerAnswers: Record<string, string>;
  healthCheckScores: Record<string, Record<string, number>>;
  aiAdoptionScores: Record<string, Record<string, number>>;
  dakiCards: DakiCard[];
  actionItems: ActionItem[];
  retroScore: number;
  retroFeedback: string;
  gameStatus?: string;
  gameStartedAt?: string;
  icebreakerQuestion?: string;
  createdBy?: string;
}

export interface DakiCard {
  id: string;
  column: 'drop' | 'add' | 'keep' | 'improve';
  content: string;
  votes: number;
  authorId: string;
  authorName: string;
  authorEmoji: string;
  category?: string;
  isSimulated?: boolean;
  votedBy?: string[];
}

export interface HealthMetric {
  id: string;
  name: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}

export const HEALTH_METRICS: HealthMetric[] = [
  {
    id: 'speed',
    name: 'Velocity & Speed',
    description: 'How fast do we deliver value without feeling rushed?',
    lowLabel: 'Crawling / Blocked',
    highLabel: 'Flying / Perfect Pace'
  },
  {
    id: 'quality',
    name: 'Code & Product Quality',
    description: 'Are we proud of our craftsmanship and code stability?',
    lowLabel: 'Buggy / Tech Debt Heavy',
    highLabel: 'Polished / Rock Solid'
  },
  {
    id: 'joy',
    name: 'Fun & Morale',
    description: 'Do we enjoy our day-to-day work and collaborate well?',
    lowLabel: 'Burnt Out / Silent',
    highLabel: 'Motivated / Great Vibes'
  },
  {
    id: 'collaboration',
    name: 'Cooperation & Support',
    description: 'Do we support each other and share knowledge easily?',
    lowLabel: 'Siloed / Friction',
    highLabel: 'One Team / Strong Support'
  },
  {
    id: 'process',
    name: 'Process & Meetings',
    description: 'Do our workflows and agile ceremonies help rather than hinder?',
    lowLabel: 'Red Tape / Wasteful',
    highLabel: 'Lean / Highly Productive'
  }
];

export const AI_ADOPTION_QUESTIONS: HealthMetric[] = [
  {
    id: 'frequency',
    name: 'AI Agent & Skill Integration',
    description: 'How consistently do you delegate tasks to AI agents and utilize skills/tools in your daily development loop?',
    lowLabel: 'Rarely / Never',
    highLabel: 'Consistently / Daily'
  },
  {
    id: 'comfort',
    name: 'Agentic Skill Mastery',
    description: 'How comfortable and fluent are you leveraging agentic skills, invoking tools, and directing AI agents rather than just prompting?',
    lowLabel: 'Lost / Struggling',
    highLabel: 'Fluent / Highly Confident'
  },
  {
    id: 'value',
    name: 'Agentic Value & Trust',
    description: 'How much actual value and trust do you feel agentic development adds to your speed and code quality?',
    lowLabel: 'No Value / Distrust',
    highLabel: 'Massive Boost / Full Trust'
  }
];

export const ICEBREAKER_QUESTIONS = [
  "If our team was an animal, what would we be and why?",
  "What is the most unusual food you've ever eaten?",
  "If you could have any superpower for just one day, what would it be?",
  "What's your favorite coding snack or drink?",
  "Show or describe the most chaotic item currently on your desk.",
  "What's the worst movie you've ever watched that you secretly enjoyed?",
  "If you had to change your career to something completely non-tech, what would you do?",
  "What song best describes your energy level today?",
  "If you could travel anywhere in time, past or future, where/when would you go?",
  "What is a hobby or skill you started but completely abandoned?",
  "If you could instantly become an expert in one random skill (non-tech), what would it be?",
  "What is the most ridiculous purchase you've made during a late-night online shopping session?",
  "If you were forced to live in a video game for a month, which game would you choose?",
  "What's the best piece of advice you've ever received that you regularly ignore?",
  "If your coding style had a theme song, what would it be?",
  "Would you rather have your internet speed capped at 1Mbps forever or never be able to drink coffee/tea again?",
  "What's the most unusual or funny job you had before entering tech?",
  "If you were a color, which color would you be and why?",
  "What is one popular food option that you absolutely cannot stand?",
  "If you could guest star in any TV show, past or present, which one would it be?",
  "What is your absolute go-to karaoke song (even if you only sing it in the shower)?"
];

export const MOCK_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: '⚡ Pegasus Frontend',
    members: [
      { id: 'm1', name: 'Pankaj K.', role: 'Tech Lead', emoji: '🧙‍♂️' },
      { id: 'm2', name: 'Sarah Miller', role: 'UI Developer', emoji: '👩‍🎨' },
      { id: 'm3', name: 'David Chen', role: 'Frontend Engineer', emoji: '🧑‍💻' },
      { id: 'm4', name: 'Aria Novak', role: 'QA Engineer', emoji: '🕵️‍♀️' },
      { id: 'm5', name: 'Leo Sterling', role: 'Product Owner', emoji: '💼' }
    ]
  },
  {
    id: 'team-2',
    name: '🔥 Titan Backend',
    members: [
      { id: 'm201', name: 'Marcus Brody', role: 'Principal Architect', emoji: '🏛️' },
      { id: 'm202', name: 'Elena Rostova', role: 'Data Engineer', emoji: '👩‍🔬' },
      { id: 'm203', name: 'Kenji Sato', role: 'DevOps Wizard', emoji: '🧙' },
      { id: 'm204', name: 'Chloe Fraser', role: 'Backend Engineer', emoji: '👩‍💻' }
    ]
  },
  {
    id: 'team-3',
    name: '📱 Phoenix Mobile',
    members: [
      { id: 'm301', name: 'Rajesh Kumar', role: 'Android Lead', emoji: '🤖' },
      { id: 'm302', name: 'Lily Dubois', role: 'iOS Lead', emoji: '🍎' },
      { id: 'm303', name: 'Tariq Al-Farsi', role: 'React Native Dev', emoji: '📱' },
      { id: 'm304', name: 'Sam Wilson', role: 'UX Designer', emoji: '🎨' }
    ]
  }
];

export const MOCK_PREVIOUS_ACTION_ITEMS: Record<string, ActionItem[]> = {
  'team-1': [
    {
      id: 'pa-1',
      description: 'Setup automatic Storybook deployments to verify UI components in PRs.',
      assigneeId: 'm2',
      dueDate: '2026-06-10',
      status: 'In Progress',
      createdInRetro: 'Retro #14'
    },
    {
      id: 'pa-2',
      description: 'Document standard release checklist in the team Wiki to avoid misses.',
      assigneeId: 'm4',
      dueDate: '2026-06-05',
      status: 'Open',
      createdInRetro: 'Retro #14'
    },
    {
      id: 'pa-3',
      description: 'Reduce CI pipeline execution time by caching npm node_modules.',
      assigneeId: 'm3',
      dueDate: '2026-05-30',
      status: 'Resolved',
      createdInRetro: 'Retro #13'
    }
  ],
  'team-2': [
    {
      id: 'pa-4',
      description: 'Migrate legacy logging service to centralized structure.',
      assigneeId: 'm203',
      dueDate: '2026-06-15',
      status: 'Open',
      createdInRetro: 'Sprint 34 Retro'
    }
  ],
  'team-3': []
};

export const MOCK_ICEBREAKER_RESPONSES: Record<string, string[]> = {
  "If our team was an animal, what would we be and why?": [
    "A honey badger, because we are resilient and take on tasks 10x our size!",
    "An octopus, because we are juggling 8 different features at once.",
    "A pack of wolves, because we always run together and help each other out.",
    "A sloth, sometimes we take our time but we get there in the end!"
  ],
  "What is the most unusual food you've ever eaten?": [
    "Durian ice cream in Singapore. Smells interesting, tastes delicious!",
    "Deep-fried tarantula. It was surprisingly crispy, like potato chips.",
    "Crocodile tail curry. Tastes like a mix of chicken and fish.",
    "Jellyfish salad. Very rubbery, not sure I'd order it again."
  ],
  "If you could have any superpower for just one day, what would it be?": [
    "Time manipulation. I could pause time to code without interruptions!",
    "Teleportation. Commutes are overrated; I want to lunch in Rome.",
    "Instant compiler. My code runs correctly on the first compile every time.",
    "Mind reading. Finally I'd understand what the Product Manager really wants!"
  ]
};

export const SIMULATED_DAKI_CARDS: Record<string, Omit<DakiCard, 'id' | 'votes'>[]> = {
  'team-1': [
    {
      column: 'drop',
      content: 'Let\'s drop having daily standups on Friday. A quick slack post is enough.',
      authorId: 'm2',
      authorName: 'Sarah Miller',
      authorEmoji: '👩‍🎨',
      category: 'Process'
    },
    {
      column: 'drop',
      content: 'Writing documentation in Google Docs. We should keep everything in Markdown near the code.',
      authorId: 'm3',
      authorName: 'David Chen',
      authorEmoji: '🧑‍💻',
      category: 'Documentation'
    },
    {
      column: 'add',
      content: 'Add automated visual regression testing. We keep having styling regressions on our dashboard.',
      authorId: 'm4',
      authorName: 'Aria Novak',
      authorEmoji: '🕵️‍♀️',
      category: 'Testing'
    },
    {
      column: 'add',
      content: 'Host bi-weekly frontend show-and-tell sessions to share neat CSS tricks and library discoveries.',
      authorId: 'm1',
      authorName: 'Pankaj K.',
      authorEmoji: '🧙‍♂️',
      category: 'Collaboration'
    },
    {
      column: 'keep',
      content: 'Pair programming sessions on complex state machine refactoring. It helped resolve three tricky bugs.',
      authorId: 'm3',
      authorName: 'David Chen',
      authorEmoji: '🧑‍💻',
      category: 'Code'
    },
    {
      column: 'keep',
      content: 'Our asynchronous review culture is working super well. PRs are reviewed within 4 hours!',
      authorId: 'm2',
      authorName: 'Sarah Miller',
      authorEmoji: '👩‍🎨',
      category: 'Process'
    },
    {
      column: 'improve',
      content: 'Improve the UX of the onboarding setup wizard. Customers are getting stuck on Step 3.',
      authorId: 'm5',
      authorName: 'Leo Sterling',
      authorEmoji: '💼',
      category: 'Product'
    },
    {
      column: 'improve',
      content: 'Webpack compile speeds. Local rebuild is taking 8 seconds, which disrupts flow.',
      authorId: 'm1',
      authorName: 'Pankaj K.',
      authorEmoji: '🧙‍♂️',
      category: 'Performance'
    }
  ]
};
