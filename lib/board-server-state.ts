import { BoardElement, PeerCursor, VersionSnapshot } from '@/types/whiteboard';

// Seed initial collaborative whiteboard sketch if empty so first-time visitors have immediate context
const INITIAL_ELEMENTS: BoardElement[] = [
  {
    id: 'seed-title-1',
    type: 'text',
    x: 120,
    y: 80,
    width: 480,
    height: 60,
    text: '🚀 Team Brainstorm & Architecture',
    strokeColor: '#1F2421',
    fillColor: 'transparent',
    strokeWidth: 2,
    roughness: 1.2,
    opacity: 1,
    fontSize: 26,
    zIndex: 1,
    updatedAt: Date.now() - 3600000,
    updatedBy: 'System',
  },
  {
    id: 'seed-rect-1',
    type: 'rectangle',
    x: 120,
    y: 170,
    width: 260,
    height: 150,
    strokeColor: '#0369A1',
    fillColor: '#BAE6FD',
    fillStyle: 'hachure',
    strokeWidth: 2,
    roughness: 1.5,
    opacity: 0.9,
    zIndex: 2,
    updatedAt: Date.now() - 3500000,
    updatedBy: 'Alex (Lead)',
  },
  {
    id: 'seed-text-2',
    type: 'text',
    x: 140,
    y: 210,
    width: 220,
    height: 70,
    text: 'Client App (Next.js 15)\n- Canvas 2D + Rough.js\n- Zero Purple Theme',
    strokeColor: '#0C4A6E',
    fillColor: 'transparent',
    strokeWidth: 1.5,
    roughness: 1,
    opacity: 1,
    fontSize: 16,
    zIndex: 3,
    updatedAt: Date.now() - 3400000,
    updatedBy: 'Alex (Lead)',
  },
  {
    id: 'seed-arrow-1',
    type: 'arrow',
    x: 390,
    y: 245,
    startX: 390,
    startY: 245,
    endX: 520,
    endY: 245,
    width: 130,
    height: 20,
    strokeColor: '#D97706',
    fillColor: 'transparent',
    strokeWidth: 2.5,
    roughness: 1.3,
    opacity: 1,
    zIndex: 4,
    updatedAt: Date.now() - 3300000,
    updatedBy: 'Alex (Lead)',
  },
  {
    id: 'seed-rect-2',
    type: 'rectangle',
    x: 530,
    y: 170,
    width: 280,
    height: 150,
    strokeColor: '#15803D',
    fillColor: '#BBF7D0',
    fillStyle: 'hachure',
    strokeWidth: 2,
    roughness: 1.5,
    opacity: 0.9,
    zIndex: 5,
    updatedAt: Date.now() - 3200000,
    updatedBy: 'Sarah (Backend)',
  },
  {
    id: 'seed-text-3',
    type: 'text',
    x: 550,
    y: 210,
    width: 240,
    height: 70,
    text: 'Sync Engine (Real-Time)\n- Multi-user Cursors\n- Version History Checkpoints',
    strokeColor: '#14532D',
    fillColor: 'transparent',
    strokeWidth: 1.5,
    roughness: 1,
    opacity: 1,
    fontSize: 16,
    zIndex: 6,
    updatedAt: Date.now() - 3100000,
    updatedBy: 'Sarah (Backend)',
  },
  {
    id: 'seed-sticky-1',
    type: 'sticky',
    x: 120,
    y: 360,
    width: 220,
    height: 190,
    text: '💡 Note for team:\nDrop UI screenshots directly onto canvas or press Ctrl+V to paste!',
    strokeColor: '#EAB308',
    fillColor: '#FEF08A',
    strokeWidth: 1.5,
    roughness: 1.2,
    opacity: 1,
    rotation: -1.5,
    zIndex: 7,
    authorName: 'David (Design)',
    updatedAt: Date.now() - 2500000,
    updatedBy: 'David (Design)',
  },
  {
    id: 'seed-sticky-2',
    type: 'sticky',
    x: 380,
    y: 360,
    width: 220,
    height: 190,
    text: '📋 Export Checklist:\n• PNG (High-DPI)\n• PDF Vector-Ready\n• Milestone Releases',
    strokeColor: '#F97316',
    fillColor: '#FED7AA',
    strokeWidth: 1.5,
    roughness: 1.2,
    opacity: 1,
    rotation: 1.8,
    zIndex: 8,
    authorName: 'Elena (QA)',
    updatedAt: Date.now() - 2200000,
    updatedBy: 'Elena (QA)',
  },
  {
    id: 'seed-diamond-1',
    type: 'diamond',
    x: 640,
    y: 360,
    width: 170,
    height: 170,
    strokeColor: '#C2410C',
    fillColor: '#F3E8D6',
    fillStyle: 'hachure',
    strokeWidth: 2,
    roughness: 1.4,
    opacity: 0.95,
    zIndex: 9,
    updatedAt: Date.now() - 2000000,
    updatedBy: 'Sarah (Backend)',
  },
  {
    id: 'seed-text-4',
    type: 'text',
    x: 670,
    y: 430,
    width: 110,
    height: 40,
    text: 'Passed\nReview?',
    strokeColor: '#7C2D12',
    fillColor: 'transparent',
    strokeWidth: 1.5,
    roughness: 1,
    opacity: 1,
    fontSize: 15,
    zIndex: 10,
    updatedAt: Date.now() - 1900000,
    updatedBy: 'Sarah (Backend)',
  },
];

const INITIAL_VERSIONS: VersionSnapshot[] = [
  {
    id: 'v-seed-001',
    timestamp: Date.now() - 3600000,
    title: 'Initial Architecture Kickoff',
    isNamedRelease: true,
    author: 'Alex (Lead)',
    elementCount: 6,
    elements: INITIAL_ELEMENTS.slice(0, 6),
  },
  {
    id: 'v-seed-002',
    timestamp: Date.now() - 1800000,
    title: 'Sprint 1 Specs & Notes Added',
    isNamedRelease: true,
    author: 'David (Design)',
    elementCount: INITIAL_ELEMENTS.length,
    elements: INITIAL_ELEMENTS,
  },
];

// Global in-memory singleton to persist state across API calls in the Node process
declare global {
  var __boardState: {
    elements: Map<string, BoardElement>;
    versions: VersionSnapshot[];
    peers: Map<string, PeerCursor>;
    subscribers: Set<(data: string) => void>;
    lastAutosaveTime: number;
  } | undefined;
}

if (!global.__boardState) {
  const elementsMap = new Map<string, BoardElement>();
  for (const el of INITIAL_ELEMENTS) {
    elementsMap.set(el.id, el);
  }

  global.__boardState = {
    elements: elementsMap,
    versions: [...INITIAL_VERSIONS],
    peers: new Map<string, PeerCursor>(),
    subscribers: new Set(),
    lastAutosaveTime: Date.now(),
  };
}

export const boardState = global.__boardState;

export function broadcastEvent(event: Record<string, unknown>) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const send of boardState.subscribers) {
    try {
      send(payload);
    } catch {
      boardState.subscribers.delete(send);
    }
  }
}

export function triggerAutoSaveIfDue(author = 'Team Member') {
  const now = Date.now();
  // Throttle autosaves to at most once every 30 seconds of activity
  if (now - boardState.lastAutosaveTime > 30000) {
    boardState.lastAutosaveTime = now;
    const elementsList = Array.from(boardState.elements.values());
    const autosaveSnapshot: VersionSnapshot = {
      id: `v-auto-${now}`,
      timestamp: now,
      title: `Autosave Checkpoint (${new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      isNamedRelease: false,
      author,
      elementCount: elementsList.length,
      elements: JSON.parse(JSON.stringify(elementsList)),
    };
    // Keep at most 20 autosaves to keep memory lean
    const nonNamedCount = boardState.versions.filter((v) => !v.isNamedRelease).length;
    if (nonNamedCount >= 20) {
      const firstAutoIdx = boardState.versions.findIndex((v) => !v.isNamedRelease);
      if (firstAutoIdx >= 0) {
        boardState.versions.splice(firstAutoIdx, 1);
      }
    }
    boardState.versions.push(autosaveSnapshot);
    broadcastEvent({
      type: 'version:added',
      version: autosaveSnapshot,
    });
  }
}
