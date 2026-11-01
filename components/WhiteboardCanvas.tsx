'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  BoardElement,
  Point,
  ToolMode,
  ViewportTransform,
} from '@/types/whiteboard';
import { renderWhiteboard } from '@/lib/sketch-renderer';

function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

interface WhiteboardCanvasProps {
  elements: BoardElement[];
  onElementsChange: (elements: BoardElement[]) => void;
  onElementCreate: (element: BoardElement) => void;
  onElementUpdate: (element: BoardElement) => void;
  onElementDelete: (id: string) => void;
  activeTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  selectedElementIds: string[];
  onSelectElements: (ids: string[]) => void;
  transform: ViewportTransform;
  onTransformChange: (t: ViewportTransform) => void;
  onBroadcastCursor: (x: number, y: number) => void;
  currentUserName: string;
  isDark: boolean;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  elements,
  onElementsChange,
  onElementCreate,
  onElementUpdate,
  onElementDelete,
  activeTool,
  onSelectTool,
  selectedElementIds,
  onSelectElements,
  transform,
  onTransformChange,
  onBroadcastCursor,
  currentUserName,
  isDark,
  imageInputRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interaction State
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [pointerStart, setPointerStart] = useState<Point>({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [activeDrawingElement, setActiveDrawingElement] = useState<BoardElement | null>(null);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [activeResizeCorner, setActiveResizeCorner] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Throttle cursor broadcast
  const lastCursorSendRef = useRef<number>(0);

  // Resize canvas to container
  const updateCanvasSize = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current.getBoundingClientRect();
    canvasRef.current.width = rect.width * dpr;
    canvasRef.current.height = rect.height * dpr;
    canvasRef.current.style.width = `${rect.width}px`;
    canvasRef.current.style.height = `${rect.height}px`;
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Main Render Loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    renderWhiteboard(
      ctx,
      canvasRef.current,
      elements,
      transform,
      selectedElementIds,
      activeDrawingElement,
      isDark
    );
  }, [elements, transform, selectedElementIds, activeDrawingElement, isDark]);

  // Screen to Canvas Coordinates Converter
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      return {
        x: (screenX - transform.x) / transform.scale,
        y: (screenY - transform.y) / transform.scale,
      };
    },
    [transform]
  );

  // Hit-testing an element
  const getElementAtPosition = useCallback(
    (pos: Point): BoardElement | null => {
      // Traverse backwards to pick top-most element first
      const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
      for (const el of sorted) {
        if (el.type === 'pen' && el.points && el.points.length > 0) {
          const tol = Math.max(14, (el.strokeWidth || 2.5) * 3);
          // Fast bounding box check with generous tolerance
          if (
            pos.x >= el.x - tol &&
            pos.x <= el.x + el.width + tol &&
            pos.y >= el.y - tol &&
            pos.y <= el.y + el.height + tol
          ) {
            if (el.points.length === 1) {
              if (Math.hypot(pos.x - el.points[0].x, pos.y - el.points[0].y) <= tol) {
                return el;
              }
            }
            for (let i = 0; i < el.points.length - 1; i++) {
              const p1 = el.points[i];
              const p2 = el.points[i + 1];
              const dist = distToSegment(pos, p1, p2);
              if (dist <= tol) return el;
            }
          }
        } else if (el.type === 'line' || el.type === 'arrow') {
          const sx = el.startX ?? el.x;
          const sy = el.startY ?? el.y;
          const ex = el.endX ?? el.x + el.width;
          const ey = el.endY ?? el.y + el.height;
          const tol = Math.max(14, (el.strokeWidth || 2) * 3);
          const dist = distToSegment(pos, { x: sx, y: sy }, { x: ex, y: ey });
          if (dist <= tol) return el;
        } else {
          // Bounding box hit test
          if (
            pos.x >= el.x &&
            pos.x <= el.x + el.width &&
            pos.y >= el.y &&
            pos.y <= el.y + el.height
          ) {
            return el;
          }
        }
      }
      return null;
    },
    [elements]
  );

  // Check resize handle hit
  const getResizeHandleAtPosition = useCallback(
    (pos: Point, el: BoardElement): string | null => {
      const handleHitDist = 12 / transform.scale;
      const handles: { id: string; x: number; y: number }[] = [
        { id: 'nw', x: el.x, y: el.y },
        { id: 'ne', x: el.x + el.width, y: el.y },
        { id: 'se', x: el.x + el.width, y: el.y + el.height },
        { id: 'sw', x: el.x, y: el.y + el.height },
        { id: 'n', x: el.x + el.width / 2, y: el.y },
        { id: 'e', x: el.x + el.width, y: el.y + el.height / 2 },
        { id: 's', x: el.x + el.width / 2, y: el.y + el.height },
        { id: 'w', x: el.x, y: el.y + el.height / 2 },
      ];

      for (const h of handles) {
        const d = Math.hypot(pos.x - h.x, pos.y - h.y);
        if (d <= handleHitDist) return h.id;
      }
      return null;
    },
    [transform.scale]
  );

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const boardPos = screenToCanvas(clientX, clientY);

    setIsPointerDown(true);
    setPointerStart(boardPos);

    // Pan mode or Space held
    if (activeTool === 'hand' || isSpacePanning || e.button === 1) {
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      return;
    }

    // Select mode
    if (activeTool === 'select') {
      // Check if clicking resize handle on selected element
      if (selectedElementIds.length === 1) {
        const selected = elements.find((el) => el.id === selectedElementIds[0]);
        if (selected) {
          const handle = getResizeHandleAtPosition(boardPos, selected);
          if (handle) {
            setActiveResizeCorner(handle);
            return;
          }
        }
      }

      const hit = getElementAtPosition(boardPos);
      if (hit) {
        onSelectElements([hit.id]);
        setDraggedElementId(hit.id);
        setDragOffset({ x: boardPos.x - hit.x, y: boardPos.y - hit.y });
      } else {
        onSelectElements([]);
      }
      return;
    }

    // Eraser mode
    if (activeTool === 'eraser') {
      const hit = getElementAtPosition(boardPos);
      if (hit) {
        onElementDelete(hit.id);
      }
      return;
    }

    // Sticky Note mode: instant drop
    if (activeTool === 'sticky') {
      const newSticky: BoardElement = {
        id: `sticky-${Date.now()}`,
        type: 'sticky',
        x: Math.round(boardPos.x - 100),
        y: Math.round(boardPos.y - 80),
        width: 220,
        height: 180,
        text: 'New thought or note...',
        strokeColor: '#EAB308',
        fillColor: '#FEF08A',
        strokeWidth: 1.5,
        roughness: 1.2,
        opacity: 1,
        rotation: (Math.random() - 0.5) * 3,
        zIndex: elements.length + 1,
        authorName: currentUserName,
        updatedAt: Date.now(),
        updatedBy: currentUserName,
      };
      onElementCreate(newSticky);
      onSelectElements([newSticky.id]);
      onSelectTool('select');
      setEditingElementId(newSticky.id);
      setEditingText(newSticky.text || '');
      return;
    }

    // Text mode: drop and edit
    if (activeTool === 'text') {
      const newText: BoardElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: Math.round(boardPos.x),
        y: Math.round(boardPos.y),
        width: 240,
        height: 50,
        text: 'Type something...',
        strokeColor: isDark ? '#E5E7EB' : '#1F2421',
        fillColor: 'transparent',
        strokeWidth: 1.5,
        roughness: 1,
        opacity: 1,
        fontSize: 18,
        zIndex: elements.length + 1,
        updatedAt: Date.now(),
        updatedBy: currentUserName,
      };
      onElementCreate(newText);
      onSelectElements([newText.id]);
      onSelectTool('select');
      setEditingElementId(newText.id);
      setEditingText(newText.text || '');
      return;
    }

    // Freehand Pen Drawing
    if (activeTool === 'pen') {
      const newStroke: BoardElement = {
        id: `pen-${Date.now()}`,
        type: 'pen',
        x: boardPos.x,
        y: boardPos.y,
        width: 1,
        height: 1,
        points: [boardPos],
        strokeColor: isDark ? '#E5E7EB' : '#1F2421',
        fillColor: 'transparent',
        strokeWidth: 2.5,
        roughness: 1.2,
        opacity: 1,
        zIndex: elements.length + 1,
        updatedAt: Date.now(),
        updatedBy: currentUserName,
      };
      setActiveDrawingElement(newStroke);
      return;
    }

    // Shape tools (rectangle, ellipse, diamond, arrow, line)
    if (['rectangle', 'ellipse', 'diamond', 'arrow', 'line'].includes(activeTool)) {
      const newShape: BoardElement = {
        id: `shape-${Date.now()}`,
        type: activeTool,
        x: boardPos.x,
        y: boardPos.y,
        startX: boardPos.x,
        startY: boardPos.y,
        endX: boardPos.x + 1,
        endY: boardPos.y + 1,
        width: 1,
        height: 1,
        strokeColor: '#C2410C', // Terracotta default
        fillColor: activeTool === 'arrow' || activeTool === 'line' ? 'transparent' : '#FED7AA',
        fillStyle: 'hachure',
        strokeWidth: 2,
        roughness: 1.4,
        opacity: 1,
        zIndex: elements.length + 1,
        updatedAt: Date.now(),
        updatedBy: currentUserName,
      };
      setActiveDrawingElement(newShape);
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const boardPos = screenToCanvas(clientX, clientY);

    // Broadcast cursor position to team (throttled to 40ms ~ 25fps)
    const now = Date.now();
    if (now - lastCursorSendRef.current > 40) {
      lastCursorSendRef.current = now;
      onBroadcastCursor(boardPos.x, boardPos.y);
    }

    // Pan in progress
    if ((activeTool === 'hand' || isSpacePanning || e.buttons === 4) && isPointerDown) {
      onTransformChange({
        ...transform,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Eraser drag
    if (activeTool === 'eraser' && isPointerDown) {
      const hit = getElementAtPosition(boardPos);
      if (hit) {
        onElementDelete(hit.id);
      }
      return;
    }

    // Resize element
    if (activeResizeCorner && selectedElementIds.length === 1 && isPointerDown) {
      const selected = elements.find((el) => el.id === selectedElementIds[0]);
      if (selected) {
        let newX = selected.x;
        let newY = selected.y;
        let newW = selected.width;
        let newH = selected.height;

        if (activeResizeCorner.includes('e')) {
          newW = Math.max(20, boardPos.x - selected.x);
        }
        if (activeResizeCorner.includes('s')) {
          newH = Math.max(20, boardPos.y - selected.y);
        }
        if (activeResizeCorner.includes('w')) {
          const right = selected.x + selected.width;
          newX = Math.min(right - 20, boardPos.x);
          newW = right - newX;
        }
        if (activeResizeCorner.includes('n')) {
          const bottom = selected.y + selected.height;
          newY = Math.min(bottom - 20, boardPos.y);
          newH = bottom - newY;
        }

        onElementUpdate({
          ...selected,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          updatedAt: Date.now(),
          updatedBy: currentUserName,
        });
      }
      return;
    }

    // Drag element position
    if (draggedElementId && isPointerDown) {
      const el = elements.find((e) => e.id === draggedElementId);
      if (el) {
        const newX = boardPos.x - dragOffset.x;
        const newY = boardPos.y - dragOffset.y;
        const dx = newX - el.x;
        const dy = newY - el.y;

        // If pen stroke or line/arrow, move internal points too
        let updated = { ...el, x: newX, y: newY };
        if (el.type === 'pen' && el.points) {
          updated.points = el.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        }
        if (el.startX !== undefined && el.startY !== undefined) {
          updated.startX = el.startX + dx;
          updated.startY = el.startY + dy;
          updated.endX = (el.endX ?? 0) + dx;
          updated.endY = (el.endY ?? 0) + dy;
        }

        onElementUpdate(updated);
      }
      return;
    }

    // Freehand pen drawing in progress
    if (activeDrawingElement && activeDrawingElement.type === 'pen' && isPointerDown) {
      const currentPoints = activeDrawingElement.points || [];
      const updatedPoints = [...currentPoints, boardPos];
      const minX = Math.min(activeDrawingElement.x, boardPos.x);
      const minY = Math.min(activeDrawingElement.y, boardPos.y);
      const maxX = Math.max(activeDrawingElement.x + activeDrawingElement.width, boardPos.x);
      const maxY = Math.max(activeDrawingElement.y + activeDrawingElement.height, boardPos.y);

      setActiveDrawingElement({
        ...activeDrawingElement,
        x: minX,
        y: minY,
        width: Math.max(2, maxX - minX),
        height: Math.max(2, maxY - minY),
        points: updatedPoints,
      });
      return;
    }

    // Shape drawing in progress
    if (activeDrawingElement && isPointerDown) {
      const startX = pointerStart.x;
      const startY = pointerStart.y;
      const curX = boardPos.x;
      const curY = boardPos.y;

      if (activeDrawingElement.type === 'arrow' || activeDrawingElement.type === 'line') {
        setActiveDrawingElement({
          ...activeDrawingElement,
          x: Math.min(startX, curX),
          y: Math.min(startY, curY),
          startX,
          startY,
          endX: curX,
          endY: curY,
          width: Math.abs(curX - startX),
          height: Math.abs(curY - startY),
        });
      } else {
        const x = Math.min(startX, curX);
        const y = Math.min(startY, curY);
        const width = Math.max(10, Math.abs(curX - startX));
        const height = Math.max(10, Math.abs(curY - startY));

        setActiveDrawingElement({
          ...activeDrawingElement,
          x,
          y,
          width,
          height,
        });
      }
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsPointerDown(false);
    setDraggedElementId(null);
    setActiveResizeCorner(null);

    if (activeDrawingElement) {
      let finalElement = activeDrawingElement;
      if (finalElement.type === 'pen' && finalElement.points && finalElement.points.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const p of finalElement.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        finalElement = {
          ...finalElement,
          x: minX,
          y: minY,
          width: Math.max(2, maxX - minX),
          height: Math.max(2, maxY - minY),
        };
      }

      // Commit drawing element to board
      onElementCreate(finalElement);
      setActiveDrawingElement(null);

      // Keep pen active so the user can continue drawing without interruption
      if (finalElement.type !== 'pen') {
        onSelectElements([finalElement.id]);
        onSelectTool('select');
      }
    }
  };

  // Canvas Double Click for instant text/sticky editing
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const boardPos = screenToCanvas(clientX, clientY);

    const hit = getElementAtPosition(boardPos);
    if (hit && (hit.type === 'sticky' || hit.type === 'text')) {
      setEditingElementId(hit.id);
      setEditingText(hit.text || '');
    }
  };

  // Wheel Zoom & Pan
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = 1.05;
      const newScale = e.deltaY < 0 ? transform.scale * zoomFactor : transform.scale / zoomFactor;
      const clampedScale = Math.min(5, Math.max(0.15, newScale));

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom centered at mouse position
      const newX = mouseX - (mouseX - transform.x) * (clampedScale / transform.scale);
      const newY = mouseY - (mouseY - transform.y) * (clampedScale / transform.scale);

      onTransformChange({
        x: newX,
        y: newY,
        scale: clampedScale,
      });
    } else {
      // Pan
      onTransformChange({
        ...transform,
        x: transform.x - e.deltaX,
        y: transform.y - e.deltaY,
      });
    }
  };

  // Drag and Drop Image Handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const boardPos = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
        insertImageFromFile(file, boardPos);
      }
    }
  };

  // Helper to read and insert image onto board
  const insertImageFromFile = useCallback(
    (file: File, pos?: Point) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (!src) return;

        const img = new Image();
        img.onload = () => {
          const maxWidth = 340;
          const aspect = img.naturalWidth / img.naturalHeight;
          const w = Math.min(maxWidth, img.naturalWidth);
          const h = w / aspect;

          const boardPos = pos || screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);

          const newImageElement: BoardElement = {
            id: `img-${Date.now()}`,
            type: 'image',
            x: Math.round(boardPos.x - w / 2),
            y: Math.round(boardPos.y - h / 2),
            width: Math.round(w),
            height: Math.round(h),
            src,
            strokeColor: '#9CA3AF',
            fillColor: 'transparent',
            strokeWidth: 1.5,
            roughness: 1,
            opacity: 1,
            zIndex: elements.length + 1,
            updatedAt: Date.now(),
            updatedBy: currentUserName,
          };

          onElementCreate(newImageElement);
          onSelectElements([newImageElement.id]);
          onSelectTool('select');
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [currentUserName, elements.length, onElementCreate, onSelectElements, onSelectTool, screenToCanvas]
  );

  // Clipboard Paste Event (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if editing text inside textarea
      if (editingElementId) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            insertImageFromFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingElementId, insertImageFromFile]);

  // Keyboard Shortcuts (Delete, Space, Tool keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingElementId) return;

      if (e.code === 'Space' && !isSpacePanning) {
        setIsSpacePanning(true);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        for (const id of selectedElementIds) {
          onElementDelete(id);
        }
        onSelectElements([]);
      }

      if (e.key === 'Escape') {
        onSelectElements([]);
        setActiveDrawingElement(null);
      }

      // Tool key shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            onSelectTool('select');
            break;
          case 'h':
            onSelectTool('hand');
            break;
          case 'p':
            onSelectTool('pen');
            break;
          case 'r':
            onSelectTool('rectangle');
            break;
          case 'o':
            onSelectTool('ellipse');
            break;
          case 'd':
            onSelectTool('diamond');
            break;
          case 'a':
            onSelectTool('arrow');
            break;
          case 'l':
            onSelectTool('line');
            break;
          case 's':
            onSelectTool('sticky');
            break;
          case 't':
            onSelectTool('text');
            break;
          case 'e':
            onSelectTool('eraser');
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editingElementId, isSpacePanning, selectedElementIds, onElementDelete, onSelectElements, onSelectTool]);

  // Save inline text edits
  const handleCommitText = () => {
    if (!editingElementId) return;
    const target = elements.find((el) => el.id === editingElementId);
    if (target) {
      onElementUpdate({
        ...target,
        text: editingText,
        updatedAt: Date.now(),
        updatedBy: currentUserName,
      });
    }
    setEditingElementId(null);
    setEditingText('');
  };

  const editingElement = elements.find((el) => el.id === editingElementId);

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative w-full h-full overflow-hidden select-none ${
        activeTool === 'hand' || isSpacePanning
          ? 'cursor-grab active:cursor-grabbing'
          : activeTool === 'pen'
          ? 'cursor-crosshair'
          : activeTool === 'eraser'
          ? 'cursor-cell'
          : 'cursor-default'
      }`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="block touch-none"
      />

      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            insertImageFromFile(files[0]);
          }
        }}
      />

      {/* In-place Text/Sticky Note Editor Overlay */}
      {editingElement && (
        <div
          className="absolute z-30"
          style={{
            left: editingElement.x * transform.scale + transform.x,
            top: editingElement.y * transform.scale + transform.y,
            width: editingElement.width * transform.scale,
            height: editingElement.height * transform.scale,
          }}
        >
          <textarea
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={handleCommitText}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || editingElement.type === 'text')) {
                e.preventDefault();
                handleCommitText();
              }
              if (e.key === 'Escape') {
                setEditingElementId(null);
              }
            }}
            placeholder="Type your notes..."
            className="w-full h-full p-3 resize-none bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-neutral-100 rounded-lg shadow-lg border-2 border-amber-500 focus:outline-hidden text-sm leading-relaxed"
            style={{
              fontSize: `${Math.max(12, (editingElement.fontSize || 16) * transform.scale)}px`,
            }}
          />
        </div>
      )}
    </div>
  );
};
