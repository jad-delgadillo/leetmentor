export interface LeetCodeProblem {
  id: string;
  title: string;
  titleSlug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  exampleTestCases: TestCase[];
  constraints: string[];
  hints: string[];
  topicTags: string[];
  companyTags: string[];
  url: string;
  codeSnippets: CodeSnippet[];
  similarQuestions: SimilarQuestion[];
}

export interface TestCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodeSnippet {
  lang: string;
  langSlug: string;
  code: string;
}

export interface SimilarQuestion {
  title: string;
  titleSlug: string;
  difficulty: string;
  translatedTitle: string | null;
}

export interface InterviewSession {
  id: string;
  problemId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'paused';
  transcript: InterviewMessage[];
  feedback?: InterviewFeedback;
}

export interface InterviewMessage {
  id: string;
  timestamp: Date;
  role: 'interviewer' | 'candidate';
  content: string;
  type: 'text' | 'voice';
  duration?: number; // for voice messages
}

export interface InterviewFeedback {
  overall: number; // 1-10 scale
  communication: number;
  problemSolving: number;
  codeQuality: number;
  timeManagement: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}
