'use client';

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import {
  BoardElement,
  PeerCursor,
  ToolMode,
  VersionSnapshot,
  ViewportTransform,
} from '@/types/whiteboard';
import { WhiteboardCanvas } from '@/components/WhiteboardCanvas';
import { Toolbar } from '@/components/Toolbar';
import { CollaborationHeader } from '@/components/CollaborationHeader';
import { ElementPropertyBar } from '@/components/ElementPropertyBar';
import { VersionHistoryDrawer } from '@/components/VersionHistoryDrawer';
import { CreateReleaseModal } from '@/components/CreateReleaseModal';
import { ExportModal } from '@/components/ExportModal';
import { LiveCursors } from '@/components/LiveCursors';
import { exportWhiteboard, ExportOptions } from '@/lib/export-utils';

const emptySubscribe = () => () => {};

export default function WhiteboardPage() {
  // Hydration-safe client detection via useSyncExternalStore
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // User Profile
  const [currentUserId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('sketchboard_user_id');
      if (!id) {
        id = `user-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('sketchboard_user_id', id);
      }
      return id;
    }
    return 'user-default';
  });

  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sketchboard_user_name') || 'Alex (Designer)';
    }
    return 'Alex (Designer)';
  });

  const [currentUserColor, setCurrentUserColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sketchboard_user_color') || '#D97706';
    }
    return '#D97706';
  });

  // Board State
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [peers, setPeers] = useState<PeerCursor[]>([]);

  // Local Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<BoardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<BoardElement[][]>([]);

  // Viewport & Tools
  const [transform, setTransform] = useState<ViewportTransform>({ x: 0, y: 0, scale: 1 });
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sketchboard_theme') === 'dark';
    }
    return false;
  });

  // Modals & Panels
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCreateReleaseOpen, setIsCreateReleaseOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Hidden image input ref
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // BroadcastChannel for instant same-browser multi-tab sync
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Sync theme changes with DOM
  useEffect(() => {
    if (!isMounted) return;
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sketchboard_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sketchboard_theme', 'light');
    }
  }, [isDark, isMounted]);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Push to Undo Stack
  const pushUndoState = useCallback((currentElements: BoardElement[]) => {
    setUndoStack((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(currentElements))]);
    setRedoStack([]);
  }, []);

  // Post Mutation Helper to Server
  const postAction = useCallback(
    async (action: string, payload: unknown) => {
      // Send to local BroadcastChannel for multi-tab
      try {
        broadcastChannelRef.current?.postMessage({
          action,
          payload,
          clientId: currentUserId,
        });
      } catch {
        // ignore
      }

      try {
        await fetch('/api/collaboration/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload, clientId: currentUserId }),
        }).catch(() => {
          // suppress network teardown errors
        });
      } catch {
        // suppress
      }
    },
    [currentUserId]
  );

  // Real-time Event Receiver Handler
  const handleIncomingSyncMessage = useCallback(
    (data: Record<string, unknown>) => {
      if (!data) return;

      // Skip own echoes
      if (data.clientId === currentUserId) return;

      const type = (data.type || data.action) as string;

      switch (type) {
        case 'init': {
          if (data.elements) setElements(data.elements as BoardElement[]);
          if (data.versions) setVersions(data.versions as VersionSnapshot[]);
          if (data.peers) setPeers(data.peers as PeerCursor[]);
          break;
        }

        case 'element:created': {
          const newEl = data.element as BoardElement;
          setElements((prev) => {
            if (prev.some((e) => e.id === newEl.id)) return prev;
            return [...prev, newEl];
          });
          break;
        }

        case 'element:updated': {
          const updatedEl = data.element as BoardElement;
          setElements((prev) =>
            prev.map((e) => (e.id === updatedEl.id ? updatedEl : e))
          );
          break;
        }

        case 'element:deleted': {
          const id = data.id as string;
          setElements((prev) => prev.filter((e) => e.id !== id));
          break;
        }

        case 'cursor:moved': {
          const cursor = data.cursor as PeerCursor;
          setPeers((prev) => {
            const index = prev.findIndex((p) => p.id === cursor.id);
            if (index >= 0) {
              const copy = [...prev];
              copy[index] = cursor;
              return copy;
            }
            return [...prev, cursor];
          });
          break;
        }

        case 'peer:joined': {
          const peer = data.peer as PeerCursor;
          setPeers((prev) => {
            if (prev.some((p) => p.id === peer.id)) return prev;
            return [...prev, peer];
          });
          break;
        }

        case 'peer:left': {
          const id = data.id as string;
          setPeers((prev) => prev.filter((p) => p.id !== id));
          break;
        }

        case 'version:added': {
          const v = data.version as VersionSnapshot;
          setVersions((prev) => [...prev, v]);
          break;
        }

        case 'board:restored': {
          const restoredElements = data.elements as BoardElement[];
          setElements(restoredElements);
          break;
        }

        case 'board:cleared': {
          setElements([]);
          break;
        }
      }
    },
    [currentUserId]
  );

  // Setup BroadcastChannel
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    try {
      const bc = new BroadcastChannel('sketchboard_sync');
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        handleIncomingSyncMessage(event.data);
      };
      return () => {
        bc.close();
      };
    } catch {
      // BroadcastChannel unsupported in some envs
    }
  }, [handleIncomingSyncMessage, isMounted]);

  // Connect to SSE Server for live updates
  useEffect(() => {
    if (!isMounted) return;

    let eventSource: EventSource | null = null;
    let isAborted = false;

    function connectSSE() {
      if (isAborted) return;
      eventSource = new EventSource('/api/collaboration/events');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingSyncMessage(data);
        } catch {
          // heartbeat ping or malformed json
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (!isAborted) {
          setTimeout(connectSSE, 3000);
        }
      };
    }

    connectSSE();

    // Announce self presence
    postAction('peer:join', {
      id: currentUserId,
      name: currentUserName,
      color: currentUserColor,
      x: 0,
      y: 0,
      lastActive: Date.now(),
    });

    return () => {
      isAborted = true;
      eventSource?.close();

      // Safely notify server of leave
      try {
        const payload = JSON.stringify({
          action: 'peer:leave',
          payload: { id: currentUserId },
          clientId: currentUserId,
        });
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/collaboration/action',
            new Blob([payload], { type: 'application/json' })
          );
        } else {
          fetch('/api/collaboration/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    };
  }, [currentUserId, currentUserName, currentUserColor, handleIncomingSyncMessage, isMounted, postAction]);

  // Update User Profile
  const handleUpdateUserProfile = (name: string, color: string) => {
    setCurrentUserName(name);
    setCurrentUserColor(color);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sketchboard_user_name', name);
      localStorage.setItem('sketchboard_user_color', color);
    }

    postAction('peer:join', {
      id: currentUserId,
      name,
      color,
      x: 0,
      y: 0,
      lastActive: Date.now(),
    });
  };

  // Broadcast Cursor Position
  const handleBroadcastCursor = useCallback(
    (x: number, y: number) => {
      postAction('cursor:move', {
        id: currentUserId,
        name: currentUserName,
        color: currentUserColor,
        x,
        y,
        selectedElementId: selectedElementIds[0] || null,
        lastActive: Date.now(),
      });
    },
    [currentUserId, currentUserName, currentUserColor, postAction, selectedElementIds]
  );

  // Element CRUD Handlers
  const handleElementCreate = useCallback(
    (newEl: BoardElement) => {
      pushUndoState(elements);
      setElements((prev) => [...prev, newEl]);
      postAction('element:create', newEl);
    },
    [elements, postAction, pushUndoState]
  );

  const handleElementUpdate = useCallback(
    (updatedEl: BoardElement) => {
      setElements((prev) =>
        prev.map((e) => (e.id === updatedEl.id ? updatedEl : e))
      );
      postAction('element:update', updatedEl);
    },
    [postAction]
  );

  const handleElementDelete = useCallback(
    (id: string) => {
      pushUndoState(elements);
      setElements((prev) => prev.filter((e) => e.id !== id));
      setSelectedElementIds((prev) => prev.filter((i) => i !== id));
      postAction('element:delete', { id });
    },
    [elements, postAction, pushUndoState]
  );

  // Element Property Bar Actions
  const selectedElement =
    elements.find((e) => selectedElementIds.includes(e.id)) || null;

  const handleUpdateSelectedProperty = (updates: Partial<BoardElement>) => {
    if (!selectedElement) return;
    pushUndoState(elements);
    const updated = {
      ...selectedElement,
      ...updates,
      updatedAt: Date.now(),
      updatedBy: currentUserName,
    };
    handleElementUpdate(updated);
  };

  const handleDuplicateSelected = () => {
    if (!selectedElement) return;
    pushUndoState(elements);
    const cloned: BoardElement = {
      ...selectedElement,
      id: `clone-${Date.now()}`,
      x: selectedElement.x + 24,
      y: selectedElement.y + 24,
      zIndex: elements.length + 1,
      updatedAt: Date.now(),
      updatedBy: currentUserName,
    };
    if (selectedElement.points) {
      cloned.points = selectedElement.points.map((p) => ({ x: p.x + 24, y: p.y + 24 }));
    }
    handleElementCreate(cloned);
    setSelectedElementIds([cloned.id]);
  };

  const handleBringForward = () => {
    if (!selectedElement) return;
    const maxZ = Math.max(...elements.map((e) => e.zIndex), 0);
    handleUpdateSelectedProperty({ zIndex: maxZ + 1 });
  };

  const handleSendBackward = () => {
    if (!selectedElement) return;
    const minZ = Math.min(...elements.map((e) => e.zIndex), 0);
    handleUpdateSelectedProperty({ zIndex: Math.max(0, minZ - 1) });
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(elements))]);
    setUndoStack((prev) => prev.slice(0, -1));
    setElements(previous);
    postAction('element:batch', { updates: previous });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(elements))]);
    setRedoStack((prev) => prev.slice(0, -1));
    setElements(next);
    postAction('element:batch', { updates: next });
  };

  // Zoom Helpers
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(5, prev.scale * 1.2),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.15, prev.scale / 1.2),
    }));
  };

  const handleResetZoom = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Version History Actions
  const handleCreateRelease = async (title: string, author: string) => {
    await postAction('version:save', {
      title,
      isNamedRelease: true,
      author,
    });
  };

  const handleRestoreVersion = async (versionId: string) => {
    pushUndoState(elements);
    await postAction('version:restore', { versionId });
  };

  // Export Whiteboard Execution
  const handleRunExport = async (options: ExportOptions) => {
    await exportWhiteboard(elements, options);
  };

  // JSON Backup / Download
  const handleExportJSON = () => {
    const data = {
      name: 'SketchBoard Collaborative Whiteboard',
      exportedAt: new Date().toISOString(),
      elements,
      versions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SketchBoard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Consistent initial placeholder during SSR to guarantee identical HTML across server and client
  if (!isMounted) {
    return (
      <main className="w-screen h-screen bg-[#FAF8F5] flex flex-col items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center text-sm font-serif font-black animate-pulse">
            ✎
          </span>
          <span className="text-base font-semibold text-neutral-800 tracking-tight">
            SketchBoard
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-sketch-grid">
      {/* Collaboration Top Bar */}
      <CollaborationHeader
        peers={peers}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserColor={currentUserColor}
        onUpdateUserProfile={handleUpdateUserProfile}
        versionsCount={versions.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenCreateRelease={() => setIsCreateReleaseOpen(true)}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        elementCount={elements.length}
      />

      {/* Interactive Infinite Canvas */}
      <div className="absolute inset-0 pt-14">
        <WhiteboardCanvas
          elements={elements}
          onElementsChange={setElements}
          onElementCreate={handleElementCreate}
          onElementUpdate={handleElementUpdate}
          onElementDelete={handleElementDelete}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          selectedElementIds={selectedElementIds}
          onSelectElements={setSelectedElementIds}
          transform={transform}
          onTransformChange={setTransform}
          onBroadcastCursor={handleBroadcastCursor}
          currentUserName={currentUserName}
          isDark={isDark}
          imageInputRef={imageInputRef}
        />

        {/* Live Multiplayer Cursors Layer */}
        <LiveCursors
          peers={peers}
          currentUserId={currentUserId}
          transform={transform}
        />
      </div>

      {/* Selected Element Floating Property Bar */}
      <ElementPropertyBar
        selectedElement={selectedElement}
        onUpdateElement={handleUpdateSelectedProperty}
        onDeleteElement={() => {
          if (selectedElement) handleElementDelete(selectedElement.id);
        }}
        onDuplicateElement={handleDuplicateSelected}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
      />

      {/* Floating Bottom Toolbar Dock */}
      <Toolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={transform.scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onTriggerImageUpload={() => imageInputRef.current?.click()}
      />

      {/* Version History Drawer */}
      <VersionHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        versions={versions}
        onOpenCreateReleaseModal={() => setIsCreateReleaseOpen(true)}
        onRestoreVersion={handleRestoreVersion}
        onExportJSON={handleExportJSON}
      />

      {/* Create Milestone Release Modal */}
      <CreateReleaseModal
        isOpen={isCreateReleaseOpen}
        onClose={() => setIsCreateReleaseOpen(false)}
        currentUser={currentUserName}
        elementCount={elements.length}
        onCreateRelease={handleCreateRelease}
      />

      {/* Export Options Modal (PDF / PNG) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        elementCount={elements.length}
        onExport={handleRunExport}
        isDark={isDark}
      />
    </main>
  );
}
