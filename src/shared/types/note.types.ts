export interface Note {
  id: string;
  text: string;
  pageUrl: string;
  pageTitle: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface NoteUpdates {
  text?: string;
  pageTitle?: string;
  tags?: string[];
}
