import type { Note } from '../../shared/types';

// Exports notes to various formats (Markdown, JSON, CSV, PDF, PNG Image)
export class NoteExporter {
  exportAsMarkdown(notes: Note[]): string {
    return notes
      .map(
        (n) =>
          `## ${n.pageTitle || 'Untitled'}\n> ${n.pageUrl}\n\n${n.text}\n\n_${new Date(n.createdAt).toLocaleString()}_`
      )
      .join('\n\n---\n\n');
  }

  exportAsJSON(notes: Note[]): string {
    return JSON.stringify(notes, null, 2);
  }

  exportAsCSV(notes: Note[]): string {
    const header = 'id,title,url,text,createdAt';
    const rows = notes.map((n) =>
      [
        n.id,
        `"${n.pageTitle.replace(/"/g, '""')}"`,
        n.pageUrl,
        `"${n.text.replace(/"/g, '""')}"`,
        n.createdAt,
      ].join(',')
    );
    return [header, ...rows].join('\n');
  }

  exportAsPDF(notes: Note[], filename = 'readnote-notes.pdf'): void {
    const lines: string[] = ['ReadNote - Exported Notes', `Exported: ${new Date().toLocaleString()}`, ''];
    notes.forEach((n, idx) => {
      lines.push(`${idx + 1}. ${n.pageTitle || 'Untitled'}`);
      if (n.pageUrl) lines.push(`   URL: ${n.pageUrl}`);
      this._wrapText(n.text, 78).forEach((l) => lines.push(`   ${l}`));
      lines.push(`   Date: ${new Date(n.createdAt).toLocaleString()}`);
      lines.push('');
    });

    const pages: string[][] = [];
    const linesPerPage = 44;
    for (let i = 0; i < lines.length; i += linesPerPage) {
      pages.push(lines.slice(i, i + linesPerPage));
    }
    if (pages.length === 0) pages.push(['ReadNote - No notes to export.']);

    const pdfBytes = this._buildSimplePDF(pages);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    this._triggerDownload(blob, filename);
  }

  async exportAsImage(notes: Note[], filename = 'readnote-notes.png'): Promise<void> {
    const width = 900;
    const padding = 36;
    const lineHeight = 24;
    const cardGap = 20;

    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    if (!measureCtx) return;
    measureCtx.font = '16px system-ui, -apple-system, sans-serif';

    const prepared = notes.map((n) => {
      const wrapped = this._wrapTextByPixels(measureCtx, n.text, width - padding * 2 - 32);
      const height = 56 + wrapped.length * lineHeight + 28;
      return { note: n, wrapped, height };
    });

    const headerHeight = 84;
    const totalCardsHeight = prepared.reduce((acc, item) => acc + item.height + cardGap, 0);
    const totalHeight = Math.max(260, headerHeight + totalCardsHeight + padding);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, totalHeight);

    // Header bar
    ctx.fillStyle = '#4361ee';
    ctx.fillRect(0, 0, width, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('ReadNote — Exported Notes', padding, 40);
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${notes.length} note${notes.length === 1 ? '' : 's'}`, width - 110, 40);

    let y = headerHeight;
    prepared.forEach(({ note, wrapped, height }) => {
      // Card background
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#dee2e6';
      ctx.lineWidth = 1;
      ctx.fillRect(padding, y, width - padding * 2, height);
      ctx.strokeRect(padding, y, width - padding * 2, height);

      // Accent bar
      ctx.fillStyle = '#4361ee';
      ctx.fillRect(padding, y, 5, height);

      // Title
      ctx.fillStyle = '#212529';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      const title = (note.pageTitle || note.pageUrl || 'Note').slice(0, 72);
      ctx.fillText(title, padding + 18, y + 28);

      // Body lines
      ctx.fillStyle = '#343a40';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      wrapped.forEach((line, idx) => {
        ctx.fillText(line, padding + 18, y + 56 + idx * lineHeight);
      });

      // Timestamp
      ctx.fillStyle = '#6c757d';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        new Date(note.createdAt).toLocaleString(),
        padding + 18,
        y + height - 12
      );

      y += height + cardGap;
    });

    await new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) this._triggerDownload(blob, filename);
        resolve();
      }, 'image/png');
    });
  }

  downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    this._triggerDownload(blob, filename);
  }

  private _triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private _wrapText(text: string, maxChars: number): string[] {
    const result: string[] = [];
    text.split(/\r?\n/).forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let current = '';
      words.forEach((w) => {
        if ((current + ' ' + w).trim().length > maxChars) {
          if (current) result.push(current);
          current = w;
        } else {
          current = current ? `${current} ${w}` : w;
        }
      });
      if (current) result.push(current);
    });
    return result.length > 0 ? result : [''];
  }

  private _wrapTextByPixels(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const lines: string[] = [];
    text.split(/\r?\n/).forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let current = '';
      words.forEach((word) => {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      });
      if (current) lines.push(current);
    });
    return lines.length > 0 ? lines : [''];
  }

  private _buildSimplePDF(pages: string[][]): Uint8Array {
    const objects: string[] = [];
    const pageObjIds: number[] = [];

    // 1: Catalog, 2: Pages, 3: Font
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objects.push(''); // placeholder for Pages
    objects.push(
      '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
    );

    let nextId = 4;
    pages.forEach((pageLines) => {
      const contentId = nextId++;
      const pageId = nextId++;
      pageObjIds.push(pageId);

      const streamLines = ['BT', '/F1 11 Tf', '50 760 Td', '15 TL'];
      pageLines.forEach((line, idx) => {
        const safe = line
          .replace(/[^\x20-\x7E]/g, '?')
          .replace(/\\/g, '\\\\')
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)');
        streamLines.push(idx === 0 ? `(${safe}) Tj` : `T* (${safe}) Tj`);
      });
      streamLines.push('ET');
      const stream = streamLines.join('\n');

      objects.push(
        `${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
      );
      objects.push(
        `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n`
      );
    });

    objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`;

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    objects.forEach((obj) => {
      offsets.push(pdf.length);
      pdf += obj;
    });

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
      const off = String(offsets[i] ?? 0).padStart(10, '0');
      pdf += `${off} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return new TextEncoder().encode(pdf);
  }
}
