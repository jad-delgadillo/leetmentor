export interface ChatGPTMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatGPTRequest {
  model: string;
  messages: ChatGPTMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatGPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatGPTMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  voice?: SpeechSynthesisVoice;
  rate: number;
  pitch: number;
  volume: number;
}

export interface SpeechRecognitionSettings {
  enabled: boolean;
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

export interface ExtensionConfig {
  apiKey: string;
  model: string;
  voice: VoiceSettings;
  speechRecognition: SpeechRecognitionSettings;
  interviewMode: 'beginner' | 'intermediate' | 'advanced';
  practiceAreas: string[];
  realtimeProxyUrl?: string;
}
