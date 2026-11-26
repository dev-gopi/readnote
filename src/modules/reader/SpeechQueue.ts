// FIFO queue for speech segments
export class SpeechQueue {
  private items: string[] = [];

  enqueue(item: string): void {
    this.items.push(item);
  }

  dequeue(): string | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items = [];
  }

  size(): number {
    return this.items.length;
  }
}
