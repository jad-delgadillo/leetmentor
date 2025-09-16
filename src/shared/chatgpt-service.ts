import { ChatGPTMessage, ChatGPTRequest, ChatGPTResponse } from '@/types/api';
import { LeetCodeProblem } from '@/types/leetcode';
import { API_ENDPOINTS, INTERVIEW_PROMPTS, MODEL_PRICING_USD_PER_1K } from './constants';

export class InterviewUtils {
  /**
   * Get a random encouragement phrase
   */
  static getRandomEncouragement(): string {
    const encouragements = INTERVIEW_PROMPTS.ENCOURAGEMENT_PHRASES;
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }

  /**
   * Get a random hint phrase
   */
  static getRandomHintPhrase(): string {
    const hints = INTERVIEW_PROMPTS.HINT_PHRASES;
    return hints[Math.floor(Math.random() * hints.length)];
  }

  /**
   * Get a random conversational transition
   */
  static getRandomTransition(): string {
    const transitions = INTERVIEW_PROMPTS.CONVERSATIONAL_TRANSITIONS;
    return transitions[Math.floor(Math.random() * transitions.length)];
  }

  /**
   * Get a random follow-up question
   */
  static getRandomFollowUp(): string {
    const followUps = INTERVIEW_PROMPTS.FOLLOW_UP_QUESTIONS;
    return followUps[Math.floor(Math.random() * followUps.length)];
  }

  /**
   * Add conversational elements to make responses more natural
   */
  static enhanceWithConversation(response: string): string {
    // Rarely add a conversational opener for professional tone
    if (Math.random() < 0.1) { // Reduced from 30% to 10%
      const openers = [
        "So, ",
        "Well, ",
        "Actually, ",
        "Hmm, "
      ];
      const opener = openers[Math.floor(Math.random() * openers.length)];
      response = opener + response.charAt(0).toLowerCase() + response.slice(1);
    }

    // Rarely add a conversational closer
    if (Math.random() < 0.08 && !response.includes('?')) { // Reduced from 20% to 8%
      const closers = [
        " What do you think?",
        " Does that make sense?",
        " What are your thoughts?"
      ];
      const closer = closers[Math.floor(Math.random() * closers.length)];
      response = response + closer;
    }

    return response;
  }

  /**
   * Make the AI sound more like a real interviewer by varying response patterns
   */
  static addInterviewerPersonality(response: string, context: 'positive' | 'questioning' | 'guiding' | 'neutral' = 'neutral'): string {
    const personalityElements = {
      positive: [
        "That approach has some merit.",
        "That's a solid observation.",
        "You've got the right idea there.",
        "That shows good understanding."
      ],
      questioning: [
        "What's your reasoning behind that choice?",
        "How did you arrive at that conclusion?",
        "Can you explain your thought process?",
        "What makes you think that would work?"
      ],
      guiding: [
        "Let's think about this systematically.",
        "Let me walk you through my thought process.",
        "Here's how I would approach this.",
        "Let me help you break this down."
      ],
      neutral: [
        "That's one perspective.",
        "There are different ways to look at this.",
        "Let's consider the alternatives.",
        "That depends on your assumptions."
      ]
    };

    if (Math.random() < 0.2) { // Reduced to 20% chance for more professional tone
      const elements = personalityElements[context];
      const element = elements[Math.floor(Math.random() * elements.length)];
      response = element + " " + response.charAt(0).toLowerCase() + response.slice(1);
    }

    return response;
  }
}

export class ChatGPTService {
  private apiKey: string;
  private model: string;
  private conversationSummary: string = '';
  private summaryMaxChars = 600;
  private historyWindow = 8; // last-N window

  public lastUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
  public totals = { prompt: 0, completion: 0, total: 0, costUsd: 0 };

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateInterviewResponse(
    problem: LeetCodeProblem,
    conversationHistory: ChatGPTMessage[],
    userMessage: string
  ): Promise<string> {
    const messages = this.buildInterviewMessages(problem, conversationHistory, userMessage);
    
    try {
      const response = await this.sendChatRequest(messages);
      // Capture usage
      if ((response as any).usage) {
        const u = (response as any).usage;
        this.lastUsage = {
          prompt_tokens: u.prompt_tokens || 0,
          completion_tokens: u.completion_tokens || 0,
          total_tokens: u.total_tokens || (u.prompt_tokens || 0) + (u.completion_tokens || 0)
        };
        const pricing = (MODEL_PRICING_USD_PER_1K as any)[this.model] || MODEL_PRICING_USD_PER_1K['gpt-4o'];
        const cost = ((this.lastUsage.prompt_tokens / 1000) * pricing.input) + ((this.lastUsage.completion_tokens / 1000) * pricing.output);
        this.totals.prompt += this.lastUsage.prompt_tokens;
        this.totals.completion += this.lastUsage.completion_tokens;
        this.totals.total += this.lastUsage.total_tokens;
        this.totals.costUsd += cost;
      }
      return response.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response. Please try again.';
    } catch (error) {
      console.error('ChatGPT API error:', error);
      throw new Error('Failed to get AI response. Please check your API key and try again.');
    }
  }

  async generateFeedback(
    problem: LeetCodeProblem,
    transcript: ChatGPTMessage[]
  ): Promise<string> {
    const feedbackPrompt = this.buildFeedbackPrompt(problem, transcript);
    
    try {
      const response = await this.sendChatRequest([feedbackPrompt]);
      return response.choices[0]?.message?.content || 'Unable to generate feedback at this time.';
    } catch (error) {
      console.error('Feedback generation error:', error);
      throw new Error('Failed to generate feedback.');
    }
  }

  private buildInterviewMessages(
    problem: LeetCodeProblem,
    history: ChatGPTMessage[],
    userMessage: string
  ): ChatGPTMessage[] {
    // 1) Concise system instruction
    const systemMessage: ChatGPTMessage = {
      role: 'system',
      content: `You are a technical interviewer. Keep answers to 1–2 sentences.
- Ask questions, avoid lecturing.
- Do not restate the problem; the candidate can see it.
- Focus on thought process, complexity, and trade‑offs.
- Keep replies concise (for TTS).`
    };

    // 2) Minimal problem context (no full description)
    const problemContext: ChatGPTMessage = {
      role: 'system',
      content: `Problem: ${problem.title} (${problem.difficulty}).`
    };

    // 3) Rolling summary for older history + last-N window
    const last = history.slice(-this.historyWindow);
    const older = history.slice(0, Math.max(0, history.length - this.historyWindow));
    if (older.length) {
      const merged = (this.conversationSummary ? this.conversationSummary + ' ' : '') + older.map(m => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content}`).join(' ');
      this.conversationSummary = merged.substring(0, this.summaryMaxChars);
    }

    const messages: ChatGPTMessage[] = [systemMessage, problemContext];
    if (this.conversationSummary) {
      messages.push({ role: 'system', content: `Conversation summary so far: ${this.conversationSummary}` });
    }
    messages.push(...last);
    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  private buildFeedbackPrompt(
    problem: LeetCodeProblem,
    transcript: ChatGPTMessage[]
  ): ChatGPTMessage {
    const conversationText = transcript
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    return {
      role: 'user',
      content: `Please provide detailed feedback for this technical interview session.

Problem: ${problem.title} (${problem.difficulty})

Interview Transcript:
${conversationText}

Please provide feedback in the following format:

## Overall Performance (1-10): [score]

## Detailed Analysis:

### Communication (1-10): [score]
[Detailed feedback on how well the candidate communicated their thought process]

### Problem Solving (1-10): [score]
[Feedback on approach, algorithm design, and problem-solving methodology]

### Code Quality (1-10): [score]
[If code was written, evaluate structure, readability, and correctness]

### Time Management (1-10): [score]
[How well they managed time and worked through the problem efficiently]

## Strengths:
- [Key strengths demonstrated]

## Areas for Improvement:
- [Specific areas to work on]

## Recommendations:
[Specific advice for future interviews and skill development]`
    };
  }

  private async sendChatRequest(messages: ChatGPTMessage[]): Promise<ChatGPTResponse> {
    const request: ChatGPTRequest = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 200
    };

    const response = await fetch(API_ENDPOINTS.OPENAI_CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendChatRequest([
        {
          role: 'user',
          content: 'Hello, please respond with "Connection successful"'
        }
      ]);
      
      return response.choices[0]?.message?.content?.includes('Connection successful') || false;
    } catch (error) {
      return false;
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setModel(model: string): void {
    this.model = model;
  }

  setHistoryWindow(n: number): void {
    if (typeof n === 'number' && n >= 2 && n <= 20) {
      this.historyWindow = Math.floor(n);
    }
  }

  setSummaryMaxChars(chars: number): void {
    if (typeof chars === 'number' && chars >= 200 && chars <= 4000) {
      this.summaryMaxChars = Math.floor(chars);
    }
  }
}
