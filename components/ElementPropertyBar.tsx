'use client';

import React from 'react';
import {
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Layers,
  Palette,
  Minus,
} from 'lucide-react';
import { BoardElement, FillStyle, INK_COLORS, NOTE_COLORS } from '@/types/whiteboard';

interface ElementPropertyBarProps {
  selectedElement: BoardElement | null;
  onUpdateElement: (updates: Partial<BoardElement>) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}

export const ElementPropertyBar: React.FC<ElementPropertyBarProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onBringForward,
  onSendBackward,
}) => {
  if (!selectedElement) return null;

  const isSticky = selectedElement.type === 'sticky';
  const isText = selectedElement.type === 'text';
  const hasStroke = selectedElement.type !== 'image';
  const hasFill =
    ['rectangle', 'ellipse', 'diamond', 'sticky'].includes(selectedElement.type);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-[#222428]/95 backdrop-blur-md rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-xl shadow-neutral-900/10 text-xs text-neutral-800 dark:text-neutral-200 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Ink / Stroke Color Picker */}
      {hasStroke && (
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-700">
          <Palette className="w-3.5 h-3.5 text-neutral-500 mr-1 shrink-0" />
          <div className="flex items-center gap-1">
            {INK_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => onUpdateElement({ strokeColor: c.hex })}
                title={c.name}
                aria-label={c.name}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  selectedElement.strokeColor === c.hex
                    ? 'scale-125 ring-2 ring-amber-500 ring-offset-1 border-neutral-400'
                    : 'border-neutral-300 dark:border-neutral-600 hover:scale-110'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Note Paper Hue (if sticky note) */}
      {isSticky && (
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-700">
          <span className="text-[11px] text-neutral-500 font-medium mr-1">Paper:</span>
          {NOTE_COLORS.map((nc) => (
            <button
              key={nc.name}
              onClick={() =>
                onUpdateElement({
                  fillColor: nc.bg,
                  strokeColor: nc.border,
                })
              }
              title={nc.name}
              aria-label={nc.name}
              className={`w-5 h-5 rounded-sm border transition-transform ${
                selectedElement.fillColor === nc.bg
                  ? 'scale-125 ring-2 ring-amber-500 ring-offset-1 border-neutral-400'
                  : 'border-neutral-300 dark:border-neutral-600 hover:scale-110'
              }`}
              style={{ backgroundColor: nc.bg }}
            />
          ))}
        </div>
      )}

      {/* Fill Style (if geometric shape) */}
      {hasFill && !isSticky && (
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-700">
          <span className="text-[11px] text-neutral-500 font-medium mr-1">Fill:</span>
          {(['none', 'hachure', 'solid'] as FillStyle[]).map((fs) => (
            <button
              key={fs}
              onClick={() => onUpdateElement({ fillStyle: fs })}
              className={`px-2 py-1 rounded capitalize text-[11px] font-medium transition-colors ${
                (selectedElement.fillStyle || 'none') === fs
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-semibold'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {fs}
            </button>
          ))}
        </div>
      )}

      {/* Stroke Width */}
      {hasStroke && !isText && (
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-700">
          <span className="text-[11px] text-neutral-500 font-medium mr-1">Stroke:</span>
          {[1.5, 2.5, 4.5].map((w) => (
            <button
              key={w}
              onClick={() => onUpdateElement({ strokeWidth: w })}
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                selectedElement.strokeWidth === w
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title={`${w}px stroke`}
            >
              <div
                className="bg-current rounded-full"
                style={{ width: 14, height: Math.max(1.5, w) }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Text Size */}
      {isText && (
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-700">
          <span className="text-[11px] text-neutral-500 font-medium mr-1">Size:</span>
          {[14, 18, 24, 32].map((s) => (
            <button
              key={s}
              onClick={() => onUpdateElement({ fontSize: s })}
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                (selectedElement.fontSize || 18) === s
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Layers & Ordering */}
      <div className="flex items-center gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-700">
        <button
          onClick={onBringForward}
          title="Bring Forward"
          aria-label="Bring Forward"
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onSendBackward}
          title="Send Backward"
          aria-label="Send Backward"
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Duplicate & Delete Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onDuplicateElement}
          title="Duplicate Element"
          aria-label="Duplicate Element"
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDeleteElement}
          title="Delete Element (Del / Backspace)"
          aria-label="Delete Element"
          className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
