'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  History,
  Download,
  Sun,
  Moon,
  Sparkles,
  Share2,
  Check,
  Tag,
  Circle,
} from 'lucide-react';
import { PeerCursor, PEER_COLORS } from '@/types/whiteboard';

interface CollaborationHeaderProps {
  peers: PeerCursor[];
  currentUserId: string;
  currentUserName: string;
  currentUserColor: string;
  onUpdateUserProfile: (name: string, color: string) => void;
  versionsCount: number;
  onOpenHistory: () => void;
  onOpenExport: () => void;
  onOpenCreateRelease: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  elementCount: number;
}

export const CollaborationHeader: React.FC<CollaborationHeaderProps> = ({
  peers,
  currentUserId,
  currentUserName,
  currentUserColor,
  onUpdateUserProfile,
  versionsCount,
  onOpenHistory,
  onOpenExport,
  onOpenCreateRelease,
  isDark,
  onToggleTheme,
  elementCount,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingName, setEditingName] = useState(currentUserName);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeCount = Math.max(1, peers.length);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingName.trim()) {
      onUpdateUserProfile(editingName.trim(), currentUserColor);
      setShowProfileMenu(false);
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 h-14 z-30 px-4 md:px-6 bg-white/90 dark:bg-[#1A1B1E]/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/"
          className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2 whitespace-nowrap"
        >
          <span className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center text-xs font-serif font-black">
            ✎
          </span>
          <span>SketchBoard</span>
        </Link>
        <span className="hidden sm:inline-block text-xs text-neutral-400">·</span>
        <span className="hidden sm:inline-block text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
          {elementCount} {elementCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Zone 2: Navigation & Collaboration Controls */}
      <div className="flex items-center gap-2 md:gap-3 text-xs">
        {/* Connected Team Members Presence */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Active teammates in this board"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {peers.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="w-5 h-5 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: p.color || '#D97706' }}
                  title={p.name}
                >
                  {(p.name || 'U').charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {activeCount} {activeCount === 1 ? 'online' : 'online'}
            </span>
          </button>

          {/* Profile & Name Popover */}
          {showProfileMenu && (
            <div className="absolute top-full mt-2 left-0 w-64 p-3 bg-white dark:bg-[#222428] rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl z-50">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Your Teammate Profile
              </h4>
              <form onSubmit={handleSaveProfile} className="space-y-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                />

                <div className="pt-1">
                  <span className="block text-[11px] text-neutral-500 mb-1">Cursor Badge Color:</span>
                  <div className="flex items-center gap-1.5">
                    {PEER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onUpdateUserProfile(editingName, color)}
                        className={`w-5 h-5 rounded-full border transition-transform ${
                          currentUserColor === color
                            ? 'scale-125 ring-2 ring-amber-500 ring-offset-1 border-white'
                            : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium"
                  >
                    Done
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Share Board Link */}
        <button
          onClick={handleCopyLink}
          title="Copy link to invite team members"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invite Team</span>
            </>
          )}
        </button>

        {/* Version History Button */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
        >
          <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
          <span className="hidden sm:inline">History</span>
          <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
            ({versionsCount})
          </span>
        </button>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenCreateRelease}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap"
        >
          <Tag className="w-3.5 h-3.5 text-amber-600" />
          <span>New Release</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 rounded-lg shadow-xs transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
