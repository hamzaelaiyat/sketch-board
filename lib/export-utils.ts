import jsPDF from 'jspdf';
import { BoardElement } from '@/types/whiteboard';
import { renderElement } from './sketch-renderer';
import rough from 'roughjs';

export interface ExportOptions {
  format: 'png' | 'pdf';
  includeBackground: boolean;
  scale?: number; // 1, 2, or 3
  isDark?: boolean;
}

export function computeElementsBoundingBox(elements: BoardElement[]) {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.type === 'pen' && el.points && el.points.length > 0) {
      for (const p of el.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    } else if (el.type === 'line' || el.type === 'arrow') {
      const sx = el.startX ?? el.x;
      const sy = el.startY ?? el.y;
      const ex = el.endX ?? el.x + el.width;
      const ey = el.endY ?? el.y + el.height;
      minX = Math.min(minX, sx, ex);
      minY = Math.min(minY, sy, ey);
      maxX = Math.max(maxX, sx, ex);
      maxY = Math.max(maxY, sy, ey);
    } else {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    }
  }

  const padding = 60;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(400, maxX - minX),
    height: Math.max(300, maxY - minY),
  };
}

export async function exportWhiteboard(
  elements: BoardElement[],
  options: ExportOptions
): Promise<void> {
  const bbox = computeElementsBoundingBox(elements);
  const scale = options.scale || 2; // Default 2x for sharp retina exports
  const width = Math.ceil(bbox.width * scale);
  const height = Math.ceil(bbox.height * scale);

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return;

  const isDark = options.isDark ?? false;

  // Background
  if (options.includeBackground) {
    ctx.fillStyle = isDark ? '#18191B' : '#FAF8F5';
    ctx.fillRect(0, 0, width, height);

    // Subtle export grid
    const gridSize = 32 * scale;
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 110, 100, 0.16)';
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  // Translate to origin of bounding box and apply scale
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-bbox.minX, -bbox.minY);

  const rc = rough.canvas(offscreen);
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  for (const el of sorted) {
    renderElement(ctx, rc, el, isDark);
  }
  ctx.restore();

  const timestamp = new Date().toISOString().slice(0, 10);

  if (options.format === 'png') {
    const dataUrl = offscreen.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `SketchBoard-${timestamp}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else if (options.format === 'pdf') {
    const isLandscape = bbox.width >= bbox.height;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Top header margin
    const margin = 12;
    const headerHeight = 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SketchBoard Collaboration Whiteboard', margin, margin + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Exported: ${new Date().toLocaleString()} · ${elements.length} elements`, margin, margin + 9);

    // Compute fit
    const availableW = pageWidth - margin * 2;
    const availableH = pageHeight - margin * 2 - headerHeight;

    const imgRatio = bbox.width / bbox.height;
    let targetW = availableW;
    let targetH = targetW / imgRatio;

    if (targetH > availableH) {
      targetH = availableH;
      targetW = targetH * imgRatio;
    }

    const posX = margin + (availableW - targetW) / 2;
    const posY = margin + headerHeight + (availableH - targetH) / 2;

    const dataUrl = offscreen.toDataURL('image/jpeg', 0.95);
    doc.addImage(dataUrl, 'JPEG', posX, posY, targetW, targetH);

    doc.save(`SketchBoard-${timestamp}.pdf`);
  }
}
