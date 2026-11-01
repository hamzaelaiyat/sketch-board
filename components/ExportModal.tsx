'use client';

import React, { useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Check } from 'lucide-react';
import { ExportOptions } from '@/lib/export-utils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  elementCount: number;
  onExport: (options: ExportOptions) => Promise<void>;
  isDark: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  elementCount,
  onExport,
  isDark,
}) => {
  const [format, setFormat] = useState<'png' | 'pdf'>('png');
  const [includeBackground, setIncludeBackground] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(2);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRunExport = async () => {
    setIsExporting(true);
    try {
      await onExport({
        format,
        includeBackground,
        scale,
        isDark,
      });
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#1E2024] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Export Whiteboard
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Export {elementCount} elements to publication-ready file
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              File Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  format === 'png'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-xs font-semibold">PNG Image</span>
                <span className="text-[10px] text-neutral-500">Raster graphic</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  format === 'pdf'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs font-semibold">PDF Document</span>
                <span className="text-[10px] text-neutral-500">Printable vector fit</span>
              </button>
            </div>
          </div>

          {/* Background toggle for PNG */}
          {format === 'png' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Canvas Background
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIncludeBackground(true)}
                  className={`px-3 py-2 rounded-lg border font-medium transition-all ${
                    includeBackground
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Paper Texture
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeBackground(false)}
                  className={`px-3 py-2 rounded-lg border font-medium transition-all ${
                    !includeBackground
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Transparent
                </button>
              </div>
            </div>
          )}

          {/* Quality / Resolution scale */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Export Scale
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    scale === s
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  {s}x {s === 2 ? '(Retina)' : s === 3 ? '(Ultra)' : '(Standard)'}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleRunExport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              {isExporting ? (
                <span>Generating...</span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
