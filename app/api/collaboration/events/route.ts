import { boardState } from '@/lib/board-server-state';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let subscriber: ((data: string) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      subscriber = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Closed by client
        }
      };

      boardState.subscribers.add(subscriber);

      // Send immediate initialization payload
      const initialPayload = {
        type: 'init',
        elements: Array.from(boardState.elements.values()),
        versions: boardState.versions,
        peers: Array.from(boardState.peers.values()),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`));

      // Periodic ping to keep connection alive through proxies
      const pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(pingTimer);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(pingTimer);
        if (subscriber) {
          boardState.subscribers.delete(subscriber);
        }
      });
    },
    cancel() {
      if (subscriber) {
        boardState.subscribers.delete(subscriber);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
