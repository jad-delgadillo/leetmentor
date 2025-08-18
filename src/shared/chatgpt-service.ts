import { ChatGPTMessage, ChatGPTRequest, ChatGPTResponse } from '@/types/api';
import { LeetCodeProblem } from '@/types/leetcode';
import { API_ENDPOINTS, INTERVIEW_PROMPTS } from './constants';

export class ChatGPTService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4') {
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
    const systemMessage: ChatGPTMessage = {
      role: 'system',
      content: `${INTERVIEW_PROMPTS.SYSTEM_PROMPT}

Current Problem:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problem.description}

Your role is to conduct a technical interview for this specific problem. Guide the candidate through:
1. Problem understanding and clarification
2. Approach discussion and algorithm design
3. Implementation guidance
4. Time/space complexity analysis
5. Edge cases and optimizations

Keep responses conversational and encouraging while maintaining interview standards.`
    };

    const messages: ChatGPTMessage[] = [systemMessage];
    
    // Add conversation history
    messages.push(...history);
    
    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

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
      max_tokens: 1000
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
}
