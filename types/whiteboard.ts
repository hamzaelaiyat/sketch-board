export type ToolMode =
  | 'select'
  | 'hand'
  | 'pen'
  | 'eraser'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'arrow'
  | 'line'
  | 'sticky'
  | 'text'
  | 'image';

export type FillStyle = 'none' | 'hachure' | 'solid';

export interface Point {
  x: number;
  y: number;
}

export interface BoardElement {
  id: string;
  type: ToolMode;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[]; // for pen strokes
  startX?: number; // for arrows & lines
  startY?: number;
  endX?: number;
  endY?: number;
  text?: string;
  src?: string; // base64 / blob URL for image
  strokeColor: string;
  fillColor: string;
  fillStyle?: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  rotation?: number; // degrees
  fontSize?: number;
  authorName?: string;
  zIndex: number;
  updatedAt: number;
  updatedBy: string;
}

export interface PeerCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  selectedElementId?: string | null;
  lastActive: number;
}

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  title: string;
  isNamedRelease: boolean;
  author: string;
  elementCount: number;
  elements: BoardElement[];
  thumbnail?: string;
}

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

// Strict zero-purple curated color system
export const INK_COLORS = [
  { name: 'Graphite', hex: '#1F2421' },
  { name: 'Charcoal', hex: '#374151' },
  { name: 'Terracotta', hex: '#C2410C' },
  { name: 'Warm Amber', hex: '#D97706' },
  { name: 'Forest Green', hex: '#15803D' },
  { name: 'Blueprint Blue', hex: '#0369A1' },
  { name: 'Sepia Ink', hex: '#78350F' },
  { name: 'Pure White', hex: '#FFFFFF' },
];

export const NOTE_COLORS = [
  { name: 'Canary Yellow', bg: '#FEF08A', border: '#EAB308', text: '#713F12' },
  { name: 'Soft Mint', bg: '#BBF7D0', border: '#22C55E', text: '#14532D' },
  { name: 'Warm Peach', bg: '#FED7AA', border: '#F97316', text: '#7C2D12' },
  { name: 'Sky Pale', bg: '#BAE6FD', border: '#0EA5E9', text: '#0C4A6E' },
  { name: 'Kraft Linen', bg: '#F3E8D6', border: '#D5C3A5', text: '#453823' },
  { name: 'Clean White', bg: '#FFFFFF', border: '#D1D5DB', text: '#1F2937' },
];

export const PEER_COLORS = [
  '#C2410C', // Terracotta
  '#D97706', // Amber
  '#15803D', // Forest Green
  '#0369A1', // Blueprint Blue
  '#0D9488', // Teal
  '#B45309', // Ochre
  '#374151', // Charcoal
];
