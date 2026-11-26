// Centralized storage key names
export const StorageKeys = {
  NOTES: 'readnote_notes',
  HIGHLIGHTS: 'readnote_highlights',
  SETTINGS: 'readnote_settings',
  AUTH_TOKEN: 'readnote_auth_token',
  LAST_SYNC: 'readnote_last_sync',
  SYNC_DATA: 'readnote_sync_data',
  SELECTED_VOICE: 'readnote_selected_voice',
  READER_SPEED: 'readnote_reader_speed',
  THEME: 'readnote_theme',
  API_KEY: 'readnote_api_key',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
