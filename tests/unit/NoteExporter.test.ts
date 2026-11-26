// Unit tests for NoteExporter
import { NoteExporter } from '../../src/modules/notes/NoteExporter';
import type { Note } from '../../src/shared/types';

describe('NoteExporter', () => {
  const exporter = new NoteExporter();

  const notes: Note[] = [
    {
      id: 'note-1',
      text: 'First note',
      pageUrl: 'https://example.com/page1',
      pageTitle: 'Page One',
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
      tags: [],
    },
    {
      id: 'note-2',
      text: 'Second, with "quotes"',
      pageUrl: 'https://example.com/page2',
      pageTitle: 'Page Two',
      createdAt: '2024-01-02T12:00:00.000Z',
      updatedAt: '2024-01-02T12:00:00.000Z',
      tags: ['important'],
    },
  ];

  it('exports as valid JSON', () => {
    const json = exporter.exportAsJSON(notes);
    const parsed = JSON.parse(json) as Note[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.id).toBe('note-1');
  });

  it('exports markdown with page titles', () => {
    const md = exporter.exportAsMarkdown(notes);
    expect(md).toContain('## Page One');
    expect(md).toContain('## Page Two');
  });

  it('exports CSV with header row', () => {
    const csv = exporter.exportAsCSV(notes);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,title,url,text,createdAt');
    expect(lines).toHaveLength(3); // header + 2 rows
  });
});
