import { NextResponse } from 'next/server';
import { boardState, broadcastEvent, triggerAutoSaveIfDue } from '@/lib/board-server-state';
import { BoardElement, PeerCursor, VersionSnapshot } from '@/types/whiteboard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload, clientId } = body;

    switch (action) {
      case 'element:create': {
        const el = payload as BoardElement;
        boardState.elements.set(el.id, el);
        broadcastEvent({
          type: 'element:created',
          element: el,
          clientId,
        });
        triggerAutoSaveIfDue(el.updatedBy);
        break;
      }

      case 'element:update': {
        const el = payload as BoardElement;
        boardState.elements.set(el.id, el);
        broadcastEvent({
          type: 'element:updated',
          element: el,
          clientId,
        });
        triggerAutoSaveIfDue(el.updatedBy);
        break;
      }

      case 'element:delete': {
        const { id } = payload as { id: string };
        boardState.elements.delete(id);
        broadcastEvent({
          type: 'element:deleted',
          id,
          clientId,
        });
        triggerAutoSaveIfDue();
        break;
      }

      case 'element:batch': {
        const { updates, deletes } = payload as {
          updates?: BoardElement[];
          deletes?: string[];
        };
        if (updates) {
          for (const el of updates) {
            boardState.elements.set(el.id, el);
          }
        }
        if (deletes) {
          for (const id of deletes) {
            boardState.elements.delete(id);
          }
        }
        broadcastEvent({
          type: 'element:batched',
          updates,
          deletes,
          clientId,
        });
        triggerAutoSaveIfDue();
        break;
      }

      case 'cursor:move': {
        const cursor = payload as PeerCursor;
        cursor.lastActive = Date.now();
        boardState.peers.set(cursor.id, cursor);
        broadcastEvent({
          type: 'cursor:moved',
          cursor,
          clientId,
        });
        break;
      }

      case 'peer:join': {
        const peer = payload as PeerCursor;
        peer.lastActive = Date.now();
        boardState.peers.set(peer.id, peer);
        broadcastEvent({
          type: 'peer:joined',
          peer,
          clientId,
        });
        break;
      }

      case 'peer:leave': {
        const { id } = payload as { id: string };
        boardState.peers.delete(id);
        broadcastEvent({
          type: 'peer:left',
          id,
          clientId,
        });
        break;
      }

      case 'version:save': {
        const { title, isNamedRelease, author, thumbnail } = payload as {
          title: string;
          isNamedRelease: boolean;
          author: string;
          thumbnail?: string;
        };
        const elementsList = Array.from(boardState.elements.values());
        const snapshot: VersionSnapshot = {
          id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          title: title || 'Named Milestone Release',
          isNamedRelease: isNamedRelease !== false,
          author: author || 'Team Member',
          elementCount: elementsList.length,
          elements: JSON.parse(JSON.stringify(elementsList)),
          thumbnail,
        };
        boardState.versions.push(snapshot);
        broadcastEvent({
          type: 'version:added',
          version: snapshot,
          clientId,
        });
        return NextResponse.json({ success: true, version: snapshot });
      }

      case 'version:restore': {
        const { versionId } = payload as { versionId: string };
        const targetVersion = boardState.versions.find((v) => v.id === versionId);
        if (!targetVersion) {
          return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }
        // Replace current canvas elements with this snapshot's elements
        boardState.elements.clear();
        for (const el of targetVersion.elements) {
          boardState.elements.set(el.id, {
            ...el,
            updatedAt: Date.now(),
          });
        }
        broadcastEvent({
          type: 'board:restored',
          versionId,
          elements: targetVersion.elements,
          clientId,
        });
        return NextResponse.json({ success: true, count: targetVersion.elements.length });
      }

      case 'board:clear': {
        boardState.elements.clear();
        broadcastEvent({
          type: 'board:cleared',
          clientId,
        });
        triggerAutoSaveIfDue('Board Cleared');
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // Prune stale peers (inactive for > 60s)
    const cutoff = Date.now() - 60000;
    for (const [id, peer] of boardState.peers.entries()) {
      if (peer.lastActive < cutoff) {
        boardState.peers.delete(id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
