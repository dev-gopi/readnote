export type AIStyle = 'concise' | 'detailed' | 'bullet-points';
export type SummaryLength = 'short' | 'medium' | 'long';
export type ExplanationLevel = 'beginner' | 'intermediate' | 'advanced';
export type QuestionType = 'multiple-choice' | 'short-answer' | 'true-false';

export interface SummaryOptions {
  style?: AIStyle;
  length?: SummaryLength;
}

export interface ExplanationOptions {
  level?: ExplanationLevel;
}

export interface QuestionOptions {
  count?: number;
  type?: QuestionType;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface AICompletionResponse {
  text: string;
}
