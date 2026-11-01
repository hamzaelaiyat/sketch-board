'use client';

import React, { useState } from 'react';
import {
  History,
  X,
  Plus,
  RotateCcw,
  Tag,
  Clock,
  Layers,
  FileDown,
  CheckCircle2,
} from 'lucide-react';
import { VersionSnapshot } from '@/types/whiteboard';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: VersionSnapshot[];
  onOpenCreateReleaseModal: () => void;
  onRestoreVersion: (versionId: string) => void;
  onExportJSON: () => void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  versions,
  onOpenCreateReleaseModal,
  onRestoreVersion,
  onExportJSON,
}) => {
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Show newest snapshots first
  const sortedVersions = [...versions].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 md:w-96 bg-white dark:bg-[#1E2024] border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-200">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-600 dark:text-amber-500" />
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Version History
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Milestone releases & autosaves
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close history"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Strip */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/40 flex items-center gap-2">
        <button
          onClick={onOpenCreateReleaseModal}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Release</span>
        </button>

        <button
          onClick={onExportJSON}
          title="Backup board to JSON file"
          className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
        >
          <FileDown className="w-4 h-4" />
        </button>
      </div>

      {/* Snapshot List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedVersions.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-xs">
            No snapshots recorded yet.
          </div>
        ) : (
          sortedVersions.map((v) => {
            const dateStr = new Date(v.timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });
            const timeStr = new Date(v.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const isConfirming = confirmRestoreId === v.id;

            return (
              <div
                key={v.id}
                className={`p-3 rounded-xl border transition-all ${
                  v.isNamedRelease
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {v.isNamedRelease ? (
                      <Tag className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    )}
                    <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                      {v.title}
                    </h3>
                  </div>
                  {v.isNamedRelease && (
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Release
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span>{v.author}</span>
                    <span aria-hidden="true">·</span>
                    <span>{dateStr} {timeStr}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <Layers className="w-3 h-3 text-neutral-400" />
                    <span>{v.elementCount} items</span>
                  </div>
                </div>

                {/* Restore Trigger & Confirmation */}
                <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end">
                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        Overwrite canvas?
                      </span>
                      <button
                        onClick={() => {
                          onRestoreVersion(v.id);
                          setConfirmRestoreId(null);
                        }}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-medium transition-colors"
                      >
                        Yes, Restore
                      </button>
                      <button
                        onClick={() => setConfirmRestoreId(null)}
                        className="px-2 py-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-[11px] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRestoreId(v.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
