import { HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Writes Server-Sent Events on an Express response: the headers once, then
 * `event:` + `data:` blocks (`data` always JSON). Knows nothing about the
 * assistant; the controller decides which events to send.
 */
export class EventStreamWriter {
  private opened = false;

  constructor(private readonly res: Response) {}

  /** Whether the client asked for a stream (`Accept: text/event-stream`). */
  static isRequested(req: Request): boolean {
    return (req.headers.accept ?? '').includes('text/event-stream');
  }

  /** Sends the headers. From here on, errors can only travel as events. */
  open(): void {
    this.res.status(HttpStatus.OK);
    this.res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    this.res.setHeader('Cache-Control', 'no-cache, no-transform');
    this.res.setHeader('Connection', 'keep-alive');
    // Proxies such as nginx buffer responses unless told not to.
    this.res.setHeader('X-Accel-Buffering', 'no');
    this.res.flushHeaders();
    this.opened = true;
  }

  send(event: string, data: unknown): void {
    if (!this.opened) this.open();
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  close(): void {
    this.res.end();
  }
}
