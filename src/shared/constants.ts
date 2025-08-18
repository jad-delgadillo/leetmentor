export const EXTENSION_NAME = 'LeetMentor';

export const API_ENDPOINTS = {
  OPENAI_CHAT: 'https://api.openai.com/v1/chat/completions',
  OPENAI_MODELS: 'https://api.openai.com/v1/models'
} as const;

export const CHATGPT_MODELS = [
  'gpt-4',
  'gpt-4-turbo-preview',
  'gpt-3.5-turbo'
] as const;

export const INTERVIEW_DIFFICULTY_LEVELS = {
  beginner: {
    name: 'Beginner',
    description: 'Focus on basic problem understanding and simple solutions',
    hints: true,
    timeLimit: 45 // minutes
  },
  intermediate: {
    name: 'Intermediate',
    description: 'Standard interview format with optimization discussions',
    hints: false,
    timeLimit: 30
  },
  advanced: {
    name: 'Advanced',
    description: 'Advanced optimization, edge cases, and follow-up questions',
    hints: false,
    timeLimit: 25
  }
} as const;

export const PRACTICE_AREAS = [
  'algorithms',
  'data-structures',
  'dynamic-programming',
  'graph-theory',
  'system-design',
  'behavioral',
  'coding-style'
] as const;

export const VOICE_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' }
] as const;

export const INTERVIEW_PROMPTS = {
  SYSTEM_PROMPT: `You are an experienced technical interviewer conducting a coding interview. Your goal is to evaluate the candidate's problem-solving skills, communication, and coding ability.

Guidelines:
- Ask clarifying questions about the problem
- Guide the candidate through their thought process
- Provide hints only when they're truly stuck
- Evaluate their approach before they start coding
- Ask about time and space complexity
- Discuss edge cases and optimizations
- Be encouraging but maintain professional standards
- Keep the conversation natural and conversational

Remember: This is practice, so be constructive and educational.`,

  WELCOME_MESSAGE: "Hello! I'm your AI interviewer today. I see you're working on this LeetCode problem. Let's start by having you explain the problem in your own words. What do you understand about what we need to solve?",

  ENCOURAGEMENT_PHRASES: [
    "That's a great observation!",
    "Good thinking!",
    "You're on the right track.",
    "Excellent approach!",
    "That's exactly right!",
    "Nice insight!",
    "Perfect! Let's continue."
  ],

  HINT_PHRASES: [
    "Let me give you a small hint...",
    "Consider this approach...",
    "What if we think about it this way...",
    "Here's something that might help...",
    "Let's break this down..."
  ]
} as const;

export const SPEECH_SETTINGS = {
  DEFAULT_RATE: 1,
  DEFAULT_PITCH: 1,
  DEFAULT_VOLUME: 1,
  RATE_RANGE: { min: 0.5, max: 2 },
  PITCH_RANGE: { min: 0, max: 2 },
  VOLUME_RANGE: { min: 0, max: 1 }
} as const;
