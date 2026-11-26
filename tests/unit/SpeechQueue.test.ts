// Unit tests for SpeechQueue
import { SpeechQueue } from '../../src/modules/reader/SpeechQueue';

describe('SpeechQueue', () => {
  let queue: SpeechQueue;

  beforeEach(() => {
    queue = new SpeechQueue();
  });

  it('starts empty', () => {
    expect(queue.isEmpty()).toBe(true);
    expect(queue.size()).toBe(0);
  });

  it('enqueues and dequeues in FIFO order', () => {
    queue.enqueue('first');
    queue.enqueue('second');
    expect(queue.dequeue()).toBe('first');
    expect(queue.dequeue()).toBe('second');
  });

  it('returns undefined when dequeuing from empty queue', () => {
    expect(queue.dequeue()).toBeUndefined();
  });

  it('reports correct size', () => {
    queue.enqueue('a');
    queue.enqueue('b');
    expect(queue.size()).toBe(2);
  });

  it('clears all items', () => {
    queue.enqueue('x');
    queue.clear();
    expect(queue.isEmpty()).toBe(true);
  });
});
