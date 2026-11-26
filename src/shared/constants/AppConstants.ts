// Application-wide constants
export const APP_NAME = 'ReadNote' as const;
export const APP_VERSION = '1.0.0' as const;

export const AI_STYLES = {
  CONCISE: 'concise',
  DETAILED: 'detailed',
  BULLET_POINTS: 'bullet-points',
} as const;

export const SUMMARY_LENGTHS = {
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
} as const;

export const HIGHLIGHT_COLORS = {
  YELLOW: '#ffe066',
  GREEN: '#b7f5a0',
  BLUE: '#a0d8f5',
  PINK: '#f5a0c8',
  PURPLE: '#d0a0f5',
} as const;

export const READER_SPEEDS = {
  SLOW: 0.75,
  NORMAL: 1.0,
  FAST: 1.5,
  VERY_FAST: 2.0,
} as const;

export const VIEWS = {
  SUMMARY: 'summary',
  NOTES: 'notes',
  HIGHLIGHTS: 'highlights',
  QUIZ: 'quiz',
} as const;

export const MESSAGE_TYPES = {
  GET_PAGE_CONTENT: 'GET_PAGE_CONTENT',
  SAVE_NOTE: 'SAVE_NOTE',
  AI_SUMMARIZE: 'AI_SUMMARIZE',
  GENERATE_QUIZ: 'GENERATE_QUIZ',
  HIGHLIGHT_SELECTION: 'HIGHLIGHT_SELECTION',
  START_READ_ALOUD: 'START_READ_ALOUD',
  TRIGGER_SUMMARY: 'TRIGGER_SUMMARY',
  ADD_NOTE: 'ADD_NOTE',
} as const;
