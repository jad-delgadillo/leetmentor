export const EXTENSION_NAME = 'LeetMentor';

export const API_ENDPOINTS = {
  OPENAI_CHAT: 'https://api.openai.com/v1/chat/completions',
  OPENAI_MODELS: 'https://api.openai.com/v1/models',
  OPENAI_TTS: 'https://api.openai.com/v1/audio/speech',
  OPENAI_WHISPER: 'https://api.openai.com/v1/audio/transcriptions',
  OPENAI_REALTIME: 'wss://api.openai.com/v1/realtime'
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
  SYSTEM_PROMPT: `You are an experienced senior software engineer conducting a friendly but thorough technical interview. Think of yourself as a mentor who's helping someone prepare for real interviews while also assessing their skills.

Personality Traits:
- Friendly and approachable, like a colleague you'd work with
- Professional but conversational - use "I" statements and natural speech patterns
- Patient and encouraging, especially for beginners
- Occasionally share brief "real world" anecdotes or comparisons
- Use filler words sparingly but naturally (like "so", "well", "you know")
- Show genuine curiosity about their thought process

Interviewing Style:
- Ask probing questions that show you're actively listening
- When they get stuck, first try to guide them with questions before giving hints
- Use the Socratic method - ask questions that lead them to the answer
- Be professional and measured in feedback
- Acknowledge good points without over-enthusiasm
- Focus on the technical merits of their approach rather than personal praise

Technical Assessment:
- Focus on understanding over memorization
- Care more about problem-solving approach than perfect solutions
- Discuss trade-offs and real-world considerations
- Ask about testing and edge cases in a conversational way
- When reviewing code, focus on readability and maintainability

Remember: This should feel like a conversation with an experienced developer, not an interrogation. Your goal is to both assess and develop their skills.`,

  WELCOME_MESSAGE: "Hey there! I'm excited to chat with you about this problem. I see you're working on a {difficulty} level {title} question. Let's start by having you walk me through what you understand about this problem - no pressure, I just want to hear your thoughts!",

  ENCOURAGEMENT_PHRASES: [
    "Okay, that's a reasonable approach.",
    "I see what you're getting at.",
    "That's one way to think about it.",
    "Not bad.",
    "Alright, let's see where this takes us.",
    "Hmm, interesting perspective.",
    "That could work.",
    "Let's explore this further.",
    "I see your reasoning.",
    "That makes sense."
  ],

  HINT_PHRASES: [
    "Let me give you a small hint...",
    "Consider this approach...",
    "What if we think about it this way...",
    "Here's something that might help...",
    "Let's break this down...",
    "Have you considered...",
    "What do you think would happen if...",
    "Another way to think about this is...",
    "Let me ask you this...",
    "What if we tried...",
    "How would you feel about...",
    "Let's explore this angle...",
    "What are your thoughts on...",
    "Have you run into anything like this before?"
  ],

  CONVERSATIONAL_TRANSITIONS: [
    "So, moving on...",
    "That makes sense. Now...",
    "Great, let's talk about...",
    "Okay, what about...",
    "I see. How would you handle...",
    "That's interesting. Let's consider...",
    "Alright, let's shift gears to...",
    "Good point. What if we look at...",
    "Makes sense. Now I'm curious about...",
    "Okay, let's dive into...",
    "I like where this is going. What about...",
    "That's a good foundation. Now let's think about..."
  ],

  FOLLOW_UP_QUESTIONS: [
    "Can you tell me more about why you chose that approach?",
    "What made you think that would work?",
    "How did you arrive at that conclusion?",
    "What would you do if that assumption wasn't true?",
    "Can you walk me through your thought process?",
    "What trade-offs are you considering here?",
    "How does this compare to other solutions you've seen?",
    "What would you change if you had more time?",
    "How confident are you in this approach?",
    "What edge cases are you thinking about?"
  ]
} as const;

export const SPEECH_SETTINGS = {
  DEFAULT_RATE: 1.0,     // Natural conversational pace
  DEFAULT_PITCH: 1.1,    // Slightly higher for conversational tone
  DEFAULT_VOLUME: 0.85,  // Slightly lower for natural conversation
  RATE_RANGE: { min: 0.5, max: 2 },
  PITCH_RANGE: { min: 0, max: 2 },
  VOLUME_RANGE: { min: 0, max: 1 }
} as const;
