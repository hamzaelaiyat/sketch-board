'use client';

import React from 'react';
import { PeerCursor, ViewportTransform } from '@/types/whiteboard';

interface LiveCursorsProps {
  peers: PeerCursor[];
  currentUserId: string;
  transform: ViewportTransform;
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({
  peers,
  currentUserId,
  transform,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {peers
        .filter((peer) => peer.id !== currentUserId)
        .map((peer) => {
          // Transform board coordinate to screen pixel
          const screenX = peer.x * transform.scale + transform.x;
          const screenY = peer.y * transform.scale + transform.y;

          return (
            <div
              key={peer.id}
              className="absolute transition-transform duration-75 ease-out flex flex-col items-start"
              style={{
                transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
                willChange: 'transform',
              }}
            >
              {/* Hand-drawn style cursor arrow */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
              >
                <path
                  d="M4 2L20 11L12 13L9 21L4 2Z"
                  fill={peer.color || '#D97706'}
                  stroke="#FFFFFF"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Name badge */}
              <div
                className="mt-1 px-2 py-0.5 rounded text-[11px] font-semibold text-white tracking-wide shadow-md whitespace-nowrap"
                style={{ backgroundColor: peer.color || '#D97706' }}
              >
                {peer.name || 'Teammate'}
              </div>
            </div>
          );
        })}
    </div>
  );
};
