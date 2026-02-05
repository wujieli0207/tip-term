export class TerminalOutputBatcher {
  private buffer: Uint8Array[] = [];
  private scheduled = false;
  private readonly immediateThreshold = 4096;

  constructor(private readonly write: (data: Uint8Array) => void) {}

  push(data: Uint8Array) {
    if (data.length === 0) return;
    if (!this.scheduled && this.buffer.length === 0 && data.length <= this.immediateThreshold) {
      // Small bursts (like prompt) should render immediately.
      this.write(data);
      return;
    }

    this.buffer.push(data);
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => this.flush());
    }
  }

  flush() {
    if (this.buffer.length === 0) {
      this.scheduled = false;
      return;
    }

    const total = this.buffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of this.buffer) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    this.buffer = [];
    this.scheduled = false;
    this.write(merged);
  }
}
