import rough from 'roughjs';
import { BoardElement, ViewportTransform } from '@/types/whiteboard';

// Cache for loaded HTMLImageElements to avoid flickering
const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  const existing = imageCache.get(src);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    return existing;
  }
  if (!existing) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    imageCache.set(src, img);
  }
  return null;
}

export function renderWhiteboard(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  elements: BoardElement[],
  transform: ViewportTransform,
  selectedElementIds: string[],
  activeDrawingElement: BoardElement | null,
  isDark: boolean
) {
  const rc = rough.canvas(canvas);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const cssWidth = canvas.clientWidth || canvas.width / dpr;
  const cssHeight = canvas.clientHeight || canvas.height / dpr;

  // Clear canvas and set scale to match device pixel ratio
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // Background tone
  ctx.fillStyle = isDark ? '#18191B' : '#FAF8F5';
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  // Render drafting dot grid
  drawDraftingGrid(ctx, transform, cssWidth, cssHeight, isDark);

  // Apply viewport pan and zoom in CSS pixels
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.scale, transform.scale);

  // Sort elements by zIndex
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sorted) {
    renderElement(ctx, rc, el, isDark);
  }

  // Render current in-progress drawing element if any
  if (activeDrawingElement) {
    renderElement(ctx, rc, activeDrawingElement, isDark);
  }

  // Render selection bounding boxes and handles
  for (const id of selectedElementIds) {
    const el = elements.find((e) => e.id === id);
    if (el) {
      renderSelectionBounds(ctx, el, transform.scale, isDark);
    }
  }

  ctx.restore();
}

function drawDraftingGrid(
  ctx: CanvasRenderingContext2D,
  transform: ViewportTransform,
  width: number,
  height: number,
  isDark: boolean
) {
  const gridSize = 32 * transform.scale;
  if (gridSize < 10) return; // don't draw if zoomed out too far

  const offsetX = ((transform.x % gridSize) + gridSize) % gridSize;
  const offsetY = ((transform.y % gridSize) + gridSize) % gridSize;

  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 110, 100, 0.16)';

  for (let x = offsetX; x < width; x += gridSize) {
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function renderElement(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: BoardElement,
  isDark: boolean
) {
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;

  // Handle element rotation if present
  if (el.rotation) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  const roughOptions = {
    stroke: el.strokeColor || (isDark ? '#E5E7EB' : '#1F2421'),
    strokeWidth: el.strokeWidth || 2,
    roughness: el.roughness ?? 1.3,
    bowing: 1.2,
    fill: el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : undefined,
    fillStyle: el.fillStyle === 'solid' ? 'solid' : el.fillStyle === 'hachure' ? 'hachure' : undefined,
    fillWeight: 1.5,
    hachureGap: 6,
    hachureAngle: -45,
  };

  switch (el.type) {
    case 'rectangle': {
      rc.rectangle(el.x, el.y, el.width, el.height, roughOptions);
      break;
    }

    case 'ellipse': {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      rc.ellipse(cx, cy, Math.max(1, el.width), Math.max(1, el.height), roughOptions);
      break;
    }

    case 'diamond': {
      const top = [el.x + el.width / 2, el.y];
      const right = [el.x + el.width, el.y + el.height / 2];
      const bottom = [el.x + el.width / 2, el.y + el.height];
      const left = [el.x, el.y + el.height / 2];
      rc.polygon([top as [number, number], right as [number, number], bottom as [number, number], left as [number, number]], roughOptions);
      break;
    }

    case 'line': {
      const sx = el.startX ?? el.x;
      const sy = el.startY ?? el.y;
      const ex = el.endX ?? el.x + el.width;
      const ey = el.endY ?? el.y + el.height;
      rc.line(sx, sy, ex, ey, roughOptions);
      break;
    }

    case 'arrow': {
      const sx = el.startX ?? el.x;
      const sy = el.startY ?? el.y;
      const ex = el.endX ?? el.x + el.width;
      const ey = el.endY ?? el.y + el.height;

      // Draw shaft
      rc.line(sx, sy, ex, ey, roughOptions);

      // Arrowhead calculations
      const angle = Math.atan2(ey - sy, ex - sx);
      const headLength = Math.max(12, (el.strokeWidth || 2) * 6);
      const arrowAngle = Math.PI / 6;

      const p1x = ex - headLength * Math.cos(angle - arrowAngle);
      const p1y = ey - headLength * Math.sin(angle - arrowAngle);
      const p2x = ex - headLength * Math.cos(angle + arrowAngle);
      const p2y = ey - headLength * Math.sin(angle + arrowAngle);

      rc.line(ex, ey, p1x, p1y, roughOptions);
      rc.line(ex, ey, p2x, p2y, roughOptions);
      break;
    }

    case 'pen': {
      if (!el.points || el.points.length === 0) break;

      const strokeColor = el.strokeColor || (isDark ? '#E5E7EB' : '#1F2421');
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = strokeColor;
      ctx.lineWidth = el.strokeWidth || 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.points.length === 1) {
        ctx.beginPath();
        ctx.arc(el.points[0].x, el.points[0].y, Math.max(1.5, (el.strokeWidth || 2.5) / 2), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);

      // Smooth quadratic curves across points
      for (let i = 1; i < el.points.length - 1; i++) {
        const xc = (el.points[i].x + el.points[i + 1].x) / 2;
        const yc = (el.points[i].y + el.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, xc, yc);
      }

      const last = el.points[el.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      break;
    }

    case 'sticky': {
      renderStickyNote(ctx, rc, el);
      break;
    }

    case 'text': {
      renderTextElement(ctx, el, isDark);
      break;
    }

    case 'image': {
      renderImageElement(ctx, rc, el);
      break;
    }
  }

  ctx.restore();
}

function renderStickyNote(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: BoardElement
) {
  const { x, y, width, height, fillColor, text, strokeColor, authorName } = el;

  // Soft drop shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.fillRect(x + 5, y + 6, width, height);
  ctx.restore();

  // Paper backing with Rough.js
  rc.rectangle(x, y, width, height, {
    stroke: strokeColor || '#D1D5DB',
    strokeWidth: 1.2,
    roughness: 1.1,
    fill: fillColor || '#FEF08A',
    fillStyle: 'solid',
  });

  // Washi tape strip at top center for tactile feel
  const tapeWidth = Math.min(60, width * 0.35);
  const tapeHeight = 16;
  const tapeX = x + (width - tapeWidth) / 2;
  const tapeY = y - 7;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = 0.8;
  ctx.fillRect(tapeX, tapeY, tapeWidth, tapeHeight);
  ctx.strokeRect(tapeX, tapeY, tapeWidth, tapeHeight);
  ctx.restore();

  // Folded dog-ear corner at bottom-right
  const fold = 16;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.beginPath();
  ctx.moveTo(x + width - fold, y + height);
  ctx.lineTo(x + width, y + height - fold);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Sticky note body text
  if (text) {
    ctx.save();
    ctx.fillStyle = '#1F2937';
    ctx.font = '15px "Caveat", "Architects Daughter", ui-sans-serif, sans-serif';
    ctx.textBaseline = 'top';

    const padding = 16;
    const maxWidth = width - padding * 2;
    const lineHeight = 22;
    const words = text.split('\n');

    let curY = y + padding + 6;
    for (const paragraph of words) {
      const tokens = paragraph.split(' ');
      let line = '';
      for (const token of tokens) {
        const testLine = line + (line ? ' ' : '') + token;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line) {
          ctx.fillText(line, x + padding, curY);
          line = token;
          curY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x + padding, curY);
      curY += lineHeight;
    }

    // Author tag at bottom right
    if (authorName) {
      ctx.font = '11px ui-sans-serif, sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.textAlign = 'right';
      ctx.fillText(`— ${authorName}`, x + width - 14, y + height - 16);
    }

    ctx.restore();
  }
}

function renderTextElement(
  ctx: CanvasRenderingContext2D,
  el: BoardElement,
  isDark: boolean
) {
  if (!el.text) return;

  ctx.save();
  ctx.fillStyle = el.strokeColor || (isDark ? '#F3F4F6' : '#1F2421');
  const fontSize = el.fontSize || 18;
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = 'top';

  const lines = el.text.split('\n');
  const lineHeight = fontSize * 1.35;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], el.x, el.y + i * lineHeight);
  }

  ctx.restore();
}

function renderImageElement(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: BoardElement
) {
  const { x, y, width, height, src } = el;

  if (!src) return;

  const img = getCachedImage(src);
  if (img) {
    // Draw sketch picture frame
    rc.rectangle(x - 4, y - 4, width + 8, height + 8, {
      stroke: '#9CA3AF',
      strokeWidth: 1.5,
      roughness: 1.2,
      fill: 'white',
      fillStyle: 'solid',
    });

    ctx.save();
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
  } else {
    // Placeholder while image decoding
    rc.rectangle(x, y, width, height, {
      stroke: '#9CA3AF',
      strokeWidth: 1.5,
      roughness: 1.3,
    });
    ctx.fillStyle = '#6B7280';
    ctx.font = '13px sans-serif';
    ctx.fillText('Loading image...', x + 16, y + height / 2);
  }
}

function renderSelectionBounds(
  ctx: CanvasRenderingContext2D,
  el: BoardElement,
  scale: number,
  isDark: boolean
) {
  const pad = 6;
  const x = el.x - pad;
  const y = el.y - pad;
  const w = el.width + pad * 2;
  const h = el.height + pad * 2;

  ctx.save();
  ctx.strokeStyle = isDark ? '#38BDF8' : '#0284C7';
  ctx.lineWidth = 1.5 / scale;
  ctx.setLineDash([4 / scale, 3 / scale]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // Corner handles
  const handleSize = 8 / scale;
  ctx.fillStyle = isDark ? '#0284C7' : '#FFFFFF';
  ctx.strokeStyle = isDark ? '#38BDF8' : '#0284C7';
  ctx.lineWidth = 1.5 / scale;

  const corners = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
    [x + w / 2, y],
    [x + w, y + h / 2],
    [x + w / 2, y + h],
    [x, y + h / 2],
  ];

  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
  }

  ctx.restore();
}
