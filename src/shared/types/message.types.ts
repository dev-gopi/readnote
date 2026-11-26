export type ViewId = 'summary' | 'notes' | 'highlights' | 'quiz' | 'settings';

export type MessageType =
  | 'GET_PAGE_CONTENT'
  | 'SAVE_NOTE'
  | 'GET_NOTES'
  | 'DELETE_NOTE'
  | 'SAVE_HIGHLIGHT'
  | 'GET_HIGHLIGHTS'
  | 'DELETE_HIGHLIGHT'
  | 'AI_SUMMARIZE'
  | 'GENERATE_QUIZ'
  | 'HIGHLIGHT_SELECTION'
  | 'START_READ_ALOUD'
  | 'STOP_READ_ALOUD'
  | 'TRANSLATE_TEXT'
  | 'TRIGGER_SUMMARY'
  | 'ADD_NOTE';

export interface ExtractedPage {
  title: string;
  url: string;
  text: string;
  html: string;
  selectedText?: string;
}

export interface ExtensionMessage<T = Record<string, unknown>> {
  type: MessageType | (string & {});
  payload?: T;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  summary?: string;
  content?: ExtractedPage;
  error?: string;
}
