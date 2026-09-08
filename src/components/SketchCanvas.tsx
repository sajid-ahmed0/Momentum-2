import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Pencil, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Grid, 
  Check, 
  Highlighter, 
  Maximize2, 
  Minimize2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  Layers,
  Spline,
  SlidersHorizontal,
  X,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Triangle,
  Star,
  Shapes,
  Type,
  Palette,
  Download,
  PaintBucket
} from 'lucide-react';
import { parseSketchPages, formatSketchPages } from '../utils/sketchUtils';

interface SketchCanvasProps {
  initialData?: string;
  onChange?: (dataUrl: string | undefined) => void;
  readOnly?: boolean;
  className?: string;
}

type Tool = 'pen' | 'highlighter' | 'shape' | 'text' | 'eraser';
type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'line' | 'triangle' | 'star';
type ShapeFillMode = 'outline' | 'semi' | 'solid';
type PaperBg = 'blank' | 'grid' | 'lines' | 'dots';

const COLOR_PALETTE = [
  { name: 'Ink Black', value: '#18181b' },
  { name: 'Navy Blue', value: '#1d4ed8' },
  { name: 'Crimson', value: '#dc2626' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Hot Pink', value: '#ec4899' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Slate Gray', value: '#64748b' },
];

const HIGHLIGHTER_PALETTE = [
  { name: 'Fluorescent Yellow', value: '#fef08a' },
  { name: 'Neon Green', value: '#86efac' },
  { name: 'Electric Cyan', value: '#67e8f9' },
  { name: 'Neon Pink', value: '#f472b6' },
  { name: 'Neon Orange', value: '#fdba74' },
  { name: 'Neon Violet', value: '#c084fc' },
];

const STROKE_SIZES = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 5 },
  { label: 'Thick', value: 10 },
  { label: 'Broad', value: 18 },
];

// Helper: Convert HEX to RGBA
const hexToRgba = (hex: string, alpha: number) => {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(char => char + char).join('');
  }
  if (c.length === 6) {
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

// Helper: 5-Point Geometric Star
const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
};

// Helper: Straight Vector Arrow
const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, strokeWidth: number) => {
  const headLength = Math.max(14, strokeWidth * 3.5);
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  const distance = Math.sqrt(dx * dx + dy * dy);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  if (distance > 6) {
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }
};

// Helper: Render custom geometric shapes with customizable colors and fill modes
const renderGeometricShape = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  strokeW: number,
  fillMode: ShapeFillMode,
  isShift: boolean
) => {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, strokeW);
  ctx.strokeStyle = color;
  ctx.fillStyle = fillMode === 'solid' ? color : hexToRgba(color, 0.25);
  ctx.globalCompositeOperation = 'source-over';

  if (shape === 'rectangle') {
    let w = x2 - x1;
    let h = y2 - y1;
    if (isShift) {
      const size = Math.max(Math.abs(w), Math.abs(h));
      w = (w >= 0 ? 1 : -1) * size;
      h = (h >= 0 ? 1 : -1) * size;
    }
    const x = w >= 0 ? x1 : x1 + w;
    const y = h >= 0 ? y1 : y1 + h;
    const width = Math.abs(w);
    const height = Math.abs(h);

    if (fillMode !== 'outline') {
      ctx.fillRect(x, y, width, height);
    }
    ctx.strokeRect(x, y, width, height);
  } else if (shape === 'circle') {
    let rx = Math.abs(x2 - x1) / 2;
    let ry = Math.abs(y2 - y1) / 2;
    if (isShift) {
      const r = Math.max(rx, ry);
      rx = r;
      ry = r;
    }
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    if (fillMode !== 'outline') {
      ctx.fill();
    }
    ctx.stroke();
  } else if (shape === 'arrow') {
    drawArrow(ctx, x1, y1, x2, y2, strokeW);
  } else if (shape === 'line') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (shape === 'triangle') {
    const topX = (x1 + x2) / 2;
    const topY = Math.min(y1, y2);
    const bottomY = Math.max(y1, y2);
    const leftX = Math.min(x1, x2);
    const rightX = Math.max(x1, x2);

    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(rightX, bottomY);
    ctx.lineTo(leftX, bottomY);
    ctx.closePath();
    if (fillMode !== 'outline') {
      ctx.fill();
    }
    ctx.stroke();
  } else if (shape === 'star') {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const outerR = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
    const innerR = outerR * 0.45;
    drawStar(ctx, cx, cy, 5, Math.max(2, outerR), Math.max(1, innerR));
    if (fillMode !== 'outline') {
      ctx.fill();
    }
    ctx.stroke();
  }

  ctx.restore();
};

export const SketchCanvas: React.FC<SketchCanvasProps> = ({
  initialData,
  onChange,
  readOnly = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [activeColor, setActiveColor] = useState<string>('#18181b');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [paperBg, setPaperBg] = useState<PaperBg>('lines');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Shape state
  const [activeShape, setActiveShape] = useState<ShapeType>('rectangle');
  const [shapeFillMode, setShapeFillMode] = useState<ShapeFillMode>('outline');
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false);

  // Text Tool Annotation state
  const [textPrompt, setTextPrompt] = useState<{ x: number; y: number; text: string } | null>(null);

  // Multi-page state
  const pagesRef = useRef<string[]>(parseSketchPages(initialData));
  const [pages, setPages] = useState<string[]>(pagesRef.current);
  const [pageIndex, setPageIndex] = useState<number>(0);

  // Canvas logical dimensions & resolution tracking (ensures drawing on the full page even when browser is zoomed out)
  const canvasDimensionsRef = useRef<{ width: number; height: number; dpr: number }>({ width: 0, height: 0, dpr: 1 });
  const isInitialLoadDoneRef = useRef<boolean>(false);

  // Undo / Redo history stack (for current page) with resolution-independent canvas snapshots
  const historyRef = useRef<{ canvas: HTMLCanvasElement; cssWidth: number; cssHeight: number }[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const lastPointRef = useRef<{ x: number; y: number; pressure: number } | null>(null);
  const lastMidRef = useRef<{ x: number; y: number } | null>(null);

  // Pen Smoothness (1 - 100%, where 100% draws straight lines)
  const [smoothness, setSmoothness] = useState<number>(20);
  const [showSmoothnessMenu, setShowSmoothnessMenu] = useState<boolean>(false);
  const smoothnessRef = useRef<number>(20);
  const strokeStartPointRef = useRef<{ x: number; y: number; pressure: number } | null>(null);
  const startCanvasImageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    smoothnessRef.current = smoothness;
  }, [smoothness]);

  // Redraw background pattern (grid, lines, dots) on bgCanvas across its full surface
  const drawPaperBackground = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = canvasDimensionsRef.current.dpr || window.devicePixelRatio || 1;
    const cssWidth = canvasDimensionsRef.current.width || (bgCanvas.width / dpr);
    const cssHeight = canvasDimensionsRef.current.height || (bgCanvas.height / dpr);

    // Reset transform to 1,1 to clear and fill the full physical bitmap with pure white
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Set DPR transform for resolution-independent pattern rendering
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (paperBg === 'blank') return;

    ctx.strokeStyle = '#e2e8f0'; // faint gray
    ctx.fillStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    if (paperBg === 'lines') {
      const lineGap = 28;
      for (let y = 40; y < cssHeight; y += lineGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cssWidth, y);
        ctx.stroke();
      }
      // Left margin line
      ctx.strokeStyle = '#fca5a5';
      ctx.beginPath();
      ctx.moveTo(48, 0);
      ctx.lineTo(48, cssHeight);
      ctx.stroke();
    } else if (paperBg === 'grid') {
      const gridSize = 24;
      ctx.beginPath();
      for (let x = gridSize; x < cssWidth; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssHeight);
      }
      for (let y = gridSize; y < cssHeight; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(cssWidth, y);
      }
      ctx.stroke();
    } else if (paperBg === 'dots') {
      const dotGap = 24;
      for (let x = dotGap; x < cssWidth; x += dotGap) {
        for (let y = dotGap; y < cssHeight; y += dotGap) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [paperBg]);

  // Export current page canvas as DataURL
  const exportCurrentPage = useCallback(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    if (!canvas || !bgCanvas) return '';
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (exportCtx) {
      exportCtx.drawImage(bgCanvas, 0, 0);
      exportCtx.drawImage(canvas, 0, 0);
      return exportCanvas.toDataURL('image/png');
    }
    return '';
  }, []);

  // Save state snapshot for undo / redo history and parent synchronization
  const recordHistorySnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const snap = document.createElement('canvas');
    snap.width = canvas.width;
    snap.height = canvas.height;
    const snapCtx = snap.getContext('2d');
    if (snapCtx) {
      snapCtx.drawImage(canvas, 0, 0);
    }

    const cssWidth = canvasDimensionsRef.current.width || (canvas.width / (window.devicePixelRatio || 1));
    const cssHeight = canvasDimensionsRef.current.height || (canvas.height / (window.devicePixelRatio || 1));

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push({ canvas: snap, cssWidth, cssHeight });

    if (newHistory.length > 30) {
      newHistory.shift();
    }

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const saveState = useCallback(() => {
    recordHistorySnapshot();

    // Save page content to pages array & notify parent
    const dataUrl = exportCurrentPage();
    pagesRef.current[pageIndex] = dataUrl;
    setPages([...pagesRef.current]);

    if (onChange) {
      onChange(formatSketchPages(pagesRef.current));
    }
  }, [exportCurrentPage, onChange, pageIndex, recordHistorySnapshot]);

  // Load an image DataURL into active canvas
  const loadPageToCanvas = useCallback((dataUrl?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = canvasDimensionsRef.current.dpr || window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    historyRef.current = [];
    historyIndexRef.current = -1;

    if (dataUrl && dataUrl.trim().length > 0) {
      const img = new Image();
      img.onload = () => {
        // Draw the saved image at 1:1 scale
        const cssW = img.naturalWidth / dpr;
        const cssH = img.naturalHeight / dpr;
        ctx.drawImage(img, 0, 0, cssW, cssH);

        recordHistorySnapshot();
      };
      img.src = dataUrl;
    } else {
      recordHistorySnapshot();
    }
  }, [recordHistorySnapshot]);

  // Dynamic Canvas Resizing Engine with Drawing Preservation & Zoom Adaptation
  const resizeCanvases = useCallback(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !bgCanvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 320);
    const height = Math.max(Math.floor(rect.height), 380);
    const dpr = window.devicePixelRatio || 1;

    const prevWidth = canvasDimensionsRef.current.width;
    const prevHeight = canvasDimensionsRef.current.height;
    const prevDpr = canvasDimensionsRef.current.dpr;

    // Skip redundant resize cycles if dimensions haven't changed
    if (width === prevWidth && height === prevHeight && dpr === prevDpr) {
      return;
    }

    // Preserve existing drawing before bitmap buffer resize clears it
    let snapshotCanvas: HTMLCanvasElement | null = null;
    if (canvas.width > 0 && canvas.height > 0 && prevWidth > 0 && prevHeight > 0) {
      snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = canvas.width;
      snapshotCanvas.height = canvas.height;
      const snapCtx = snapshotCanvas.getContext('2d');
      if (snapCtx) {
        snapCtx.drawImage(canvas, 0, 0);
      }
    }

    // Update stored dimension metadata
    canvasDimensionsRef.current = { width, height, dpr };

    // Update canvas buffer resolutions to match true physical pixels
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    bgCanvas.width = Math.round(width * dpr);
    bgCanvas.height = Math.round(height * dpr);

    // Apply scale transform so all drawing coordinates operate seamlessly in CSS pixel units
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const bgCtx = bgCanvas.getContext('2d');
    if (bgCtx) {
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Redraw paper background across the entire newly resized surface
    drawPaperBackground();

    // Restore drawing onto the resized canvas
    if (ctx) {
      if (snapshotCanvas) {
        // Draw the saved content at its original CSS dimensions and position (0, 0)
        ctx.drawImage(snapshotCanvas, 0, 0, prevWidth, prevHeight);
      } else if (!isInitialLoadDoneRef.current) {
        // Initial first-time load from pagesRef
        isInitialLoadDoneRef.current = true;
        loadPageToCanvas(pagesRef.current[pageIndex]);
      }
    }
  }, [drawPaperBackground, loadPageToCanvas, pageIndex]);

  // Responsive Observer & Window/DPR Zoom listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial resize trigger
    resizeCanvases();

    let animationFrameId: number | null = null;
    const scheduleResize = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        resizeCanvases();
      });
    };

    // 1. Observe container size changes (detects zoom in/out, modal resizing, flex layout changes)
    const resizeObserver = new ResizeObserver(() => {
      scheduleResize();
    });
    resizeObserver.observe(container);

    // 2. Window resize event (triggered on browser zoom Ctrl +/- and window resize)
    window.addEventListener('resize', scheduleResize);

    // 3. Match media resolution change (detects devicePixelRatio changes during browser zoom)
    let removeDprListener: (() => void) | null = null;
    const listenForDprChange = () => {
      const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dpr)`);
      const onDprChange = () => {
        scheduleResize();
        listenForDprChange();
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', onDprChange, { once: true });
        removeDprListener = () => mediaQuery.removeEventListener('change', onDprChange);
      }
    };
    listenForDprChange();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleResize);
      if (removeDprListener) removeDprListener();
    };
  }, [resizeCanvases]);

  // Sync with initialData changes from parent
  useEffect(() => {
    const parsed = parseSketchPages(initialData);
    const formattedCurrent = formatSketchPages(pagesRef.current);
    const formattedInitial = formatSketchPages(parsed);
    if (formattedCurrent !== formattedInitial) {
      pagesRef.current = parsed;
      setPages(parsed);
      setPageIndex(0);
      loadPageToCanvas(parsed[0]);
    }
  }, [initialData, loadPageToCanvas]);

  // Redraw background whenever paperBg changes
  useEffect(() => {
    drawPaperBackground();
  }, [paperBg, drawPaperBackground]);

  // Multi-page switching & operations
  const handleSwitchPage = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= pagesRef.current.length || targetIndex === pageIndex) return;
    // Save current page state
    const currentDataUrl = exportCurrentPage();
    pagesRef.current[pageIndex] = currentDataUrl;
    
    setPageIndex(targetIndex);
    loadPageToCanvas(pagesRef.current[targetIndex]);
  };

  const handleAddPage = () => {
    // Save current page state
    const currentDataUrl = exportCurrentPage();
    pagesRef.current[pageIndex] = currentDataUrl;

    // Append new empty page
    pagesRef.current.push('');
    const newIdx = pagesRef.current.length - 1;
    setPages([...pagesRef.current]);
    setPageIndex(newIdx);
    loadPageToCanvas('');

    if (onChange) {
      onChange(formatSketchPages(pagesRef.current));
    }
  };

  const handleDeletePage = (indexToDelete: number) => {
    if (pagesRef.current.length <= 1) {
      handleClear();
      return;
    }
    pagesRef.current.splice(indexToDelete, 1);
    const newIdx = Math.min(indexToDelete, pagesRef.current.length - 1);
    setPages([...pagesRef.current]);
    setPageIndex(newIdx);
    loadPageToCanvas(pagesRef.current[newIdx]);

    if (onChange) {
      onChange(formatSketchPages(pagesRef.current));
    }
  };

  // Pointer position helper
  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    return { x, y, pressure };
  };

  // Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    // Text tool click to annotate
    if (activeTool === 'text') {
      const pos = getPointerPos(e);
      setTextPrompt({ x: Math.round(pos.x), y: Math.round(pos.y), text: '' });
      return;
    }

    // Close open text prompt if tapping elsewhere
    if (textPrompt) {
      setTextPrompt(null);
    }

    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);

    const pos = getPointerPos(e);
    setIsDrawing(true);
    lastPointRef.current = pos;
    lastMidRef.current = { x: pos.x, y: pos.y };
    strokeStartPointRef.current = pos;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Shape drawing live snapshot
    if (activeTool === 'shape') {
      startCanvasImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return;
    }

    // At 100% smoothness (straight line mode), capture canvas snapshot for live rubber-band preview
    if (smoothnessRef.current === 100) {
      startCanvasImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      startCanvasImageDataRef.current = null;
    }

    ctx.beginPath();
    const radius = activeTool === 'eraser' 
      ? (strokeWidth * 1.5) 
      : activeTool === 'highlighter' 
      ? Math.max(4, strokeWidth * 1.8) 
      : (strokeWidth / 2);

    ctx.arc(pos.x, pos.y, Math.max(1, radius), 0, Math.PI * 2);
    
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else if (activeTool === 'highlighter') {
      // Authentic translucent screen highlighter: multiplies color over white paper without obscuring notes beneath
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = hexToRgba(activeColor, 0.45);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = activeColor;
    }
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly || !lastPointRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Interactive Geometric Shape Drag Preview
    if (activeTool === 'shape') {
      if (startCanvasImageDataRef.current && strokeStartPointRef.current) {
        ctx.putImageData(startCanvasImageDataRef.current, 0, 0);
        const rect = canvas.getBoundingClientRect();
        const currentPos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          pressure: 0.5
        };

        renderGeometricShape(
          ctx,
          activeShape,
          strokeStartPointRef.current.x,
          strokeStartPointRef.current.y,
          currentPos.x,
          currentPos.y,
          activeColor,
          strokeWidth,
          shapeFillMode,
          e.shiftKey
        );

        lastPointRef.current = currentPos;
      }
      return;
    }

    // 100% Smoothness: Live straight line from start point to current pointer
    if (smoothnessRef.current === 100) {
      if (startCanvasImageDataRef.current && strokeStartPointRef.current) {
        ctx.putImageData(startCanvasImageDataRef.current, 0, 0);

        const rect = canvas.getBoundingClientRect();
        const currentPos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          pressure: e.pressure > 0 ? e.pressure : 0.5
        };

        ctx.beginPath();
        ctx.moveTo(strokeStartPointRef.current.x, strokeStartPointRef.current.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (activeTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = strokeWidth * 3;
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else if (activeTool === 'highlighter') {
          ctx.globalCompositeOperation = 'multiply';
          ctx.lineWidth = Math.max(8, strokeWidth * 3.5);
          ctx.strokeStyle = hexToRgba(activeColor, 0.45);
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineWidth = Math.max(1, strokeWidth);
          ctx.strokeStyle = activeColor;
        }

        ctx.stroke();
        lastPointRef.current = currentPos;
      }
      return;
    }

    if (!lastMidRef.current) return;

    // 1% - 99% Smoothness: Streamline exponential moving average filter
    const nativeEv = e.nativeEvent as any;
    const coalescedEvents = (nativeEv && typeof nativeEv.getCoalescedEvents === 'function')
      ? nativeEv.getCoalescedEvents()
      : [e];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const s = smoothnessRef.current;
    // Filter factor: 1% = 0.99 (raw responsive), 50% = 0.55, 90% = 0.19, 99% = 0.11 (fluid streamline)
    const filterWeight = s <= 1 ? 1.0 : Math.max(0.08, 1 - (s / 100) * 0.90);

    for (const ptEv of coalescedEvents) {
      const rect = canvas.getBoundingClientRect();
      const rawPos = {
        x: ptEv.clientX - rect.left,
        y: ptEv.clientY - rect.top,
        pressure: ptEv.pressure > 0 ? ptEv.pressure : 0.5
      };

      const lastPos = lastPointRef.current!;
      const lastMid = lastMidRef.current!;

      const currentPos = {
        x: lastPos.x + (rawPos.x - lastPos.x) * filterWeight,
        y: lastPos.y + (rawPos.y - lastPos.y) * filterWeight,
        pressure: rawPos.pressure
      };

      const currentMid = {
        x: (lastPos.x + currentPos.x) / 2,
        y: (lastPos.y + currentPos.y) / 2
      };

      ctx.beginPath();
      ctx.moveTo(lastMid.x, lastMid.y);
      ctx.quadraticCurveTo(lastPos.x, lastPos.y, currentMid.x, currentMid.y);

      const adjustedWidth = strokeWidth * (0.5 + currentPos.pressure * 0.8);

      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = strokeWidth * 3;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else if (activeTool === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineWidth = Math.max(8, strokeWidth * 3.5);
        ctx.strokeStyle = hexToRgba(activeColor, 0.45);
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = Math.max(1, adjustedWidth);
        ctx.strokeStyle = activeColor;
      }

      ctx.stroke();

      lastMidRef.current = currentMid;
      lastPointRef.current = currentPos;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    canvasRef.current?.releasePointerCapture(e.pointerId);

    const canvas = canvasRef.current;

    // Finalize Shape
    if (activeTool === 'shape') {
      if (startCanvasImageDataRef.current && strokeStartPointRef.current && lastPointRef.current && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(startCanvasImageDataRef.current, 0, 0);
          renderGeometricShape(
            ctx,
            activeShape,
            strokeStartPointRef.current.x,
            strokeStartPointRef.current.y,
            lastPointRef.current.x,
            lastPointRef.current.y,
            activeColor,
            strokeWidth,
            shapeFillMode,
            e.shiftKey
          );
        }
      }
      startCanvasImageDataRef.current = null;
      strokeStartPointRef.current = null;
      lastPointRef.current = null;
      lastMidRef.current = null;
      setIsDrawing(false);
      saveState();
      return;
    }

    // 100% Smoothness: Finalize straight line stroke
    if (smoothnessRef.current === 100) {
      if (canvas && startCanvasImageDataRef.current && strokeStartPointRef.current && lastPointRef.current) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(startCanvasImageDataRef.current, 0, 0);

          ctx.beginPath();
          ctx.moveTo(strokeStartPointRef.current.x, strokeStartPointRef.current.y);
          ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (activeTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = strokeWidth * 3;
            ctx.strokeStyle = 'rgba(0,0,0,1)';
          } else if (activeTool === 'highlighter') {
            ctx.globalCompositeOperation = 'multiply';
            ctx.lineWidth = Math.max(8, strokeWidth * 3.5);
            ctx.strokeStyle = hexToRgba(activeColor, 0.45);
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = Math.max(1, strokeWidth);
            ctx.strokeStyle = activeColor;
          }
          ctx.stroke();
        }
      }
      startCanvasImageDataRef.current = null;
      strokeStartPointRef.current = null;
      lastPointRef.current = null;
      lastMidRef.current = null;
      setIsDrawing(false);
      saveState();
      return;
    }

    // 1% - 99% Smoothness: Complete curved stroke
    if (lastPointRef.current && lastMidRef.current && canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastMidRef.current.x, lastMidRef.current.y);
        ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (activeTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = strokeWidth * 3;
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else if (activeTool === 'highlighter') {
          ctx.globalCompositeOperation = 'multiply';
          ctx.lineWidth = Math.max(8, strokeWidth * 3.5);
          ctx.strokeStyle = hexToRgba(activeColor, 0.45);
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineWidth = Math.max(1, strokeWidth);
          ctx.strokeStyle = activeColor;
        }
        ctx.stroke();
      }
    }

    setIsDrawing(false);
    startCanvasImageDataRef.current = null;
    strokeStartPointRef.current = null;
    lastPointRef.current = null;
    lastMidRef.current = null;
    saveState();
  };

  // Commit Text annotation to canvas
  const handleCommitText = () => {
    if (!textPrompt || !textPrompt.text.trim()) {
      setTextPrompt(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontSize = Math.max(16, strokeWidth * 4.5);
    ctx.save();
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = activeColor;
    ctx.textBaseline = 'top';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillText(textPrompt.text, textPrompt.x, textPrompt.y);
    ctx.restore();

    setTextPrompt(null);
    saveState();
  };

  // Download high-resolution PNG of the active sketch page
  const handleDownloadPage = () => {
    const dataUrl = exportCurrentPage();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `sketch-note-page-${pageIndex + 1}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Undo / Redo actions
  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = canvasDimensionsRef.current.dpr || window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = historyRef.current[historyIndexRef.current];
      if (target && target.canvas) {
        ctx.drawImage(target.canvas, 0, 0, target.cssWidth, target.cssHeight);
      }

      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);

      const dataUrl = exportCurrentPage();
      pagesRef.current[pageIndex] = dataUrl;
      setPages([...pagesRef.current]);
      if (onChange) onChange(formatSketchPages(pagesRef.current));
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = canvasDimensionsRef.current.dpr || window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = historyRef.current[historyIndexRef.current];
      if (target && target.canvas) {
        ctx.drawImage(target.canvas, 0, 0, target.cssWidth, target.cssHeight);
      }

      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);

      const dataUrl = exportCurrentPage();
      pagesRef.current[pageIndex] = dataUrl;
      setPages([...pagesRef.current]);
      if (onChange) onChange(formatSketchPages(pagesRef.current));
    }
  };

  const handleClear = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = canvasDimensionsRef.current.dpr || window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    saveState();
  };

  return (
    <div className={`flex flex-col bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl ${
      isFullscreen 
        ? 'fixed inset-2 md:inset-4 z-50 m-auto w-[calc(100vw-16px)] md:w-[calc(100vw-32px)] h-[calc(100vh-16px)] md:h-[calc(100vh-32px)]' 
        : className || 'w-full'
    }`}>
      {/* Top Main Toolbar */}
      {!readOnly && (
        <div className="flex flex-col bg-zinc-950 border-b border-zinc-800 text-zinc-300">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5">
            {/* Tools & Settings */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Primary Tool Selection */}
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('pen');
                    if (activeColor === '#fef08a' || activeColor === '#86efac' || activeColor === '#67e8f9') {
                      setActiveColor('#18181b');
                    }
                  }}
                  className={`p-1.5 md:p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === 'pen' ? 'bg-zinc-100 text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`}
                  title="Stylus / Pen Tool"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('highlighter');
                    if (activeColor === '#18181b' || activeColor === '#1d4ed8') {
                      setActiveColor('#fef08a');
                    }
                  }}
                  className={`p-1.5 md:p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === 'highlighter' ? 'bg-amber-400 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'}`}
                  title="Screen Highlighter Tool (Translucent overlay)"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Highlighter</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool('shape')}
                  className={`p-1.5 md:p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === 'shape' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'}`}
                  title="Geometric Shapes (Rectangle, Circle, Arrow, Line, Triangle, Star)"
                >
                  <Shapes className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Shapes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool('text')}
                  className={`p-1.5 md:p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === 'text' ? 'bg-zinc-100 text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`}
                  title="Text Annotation (Click canvas to type)"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Text</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool('eraser')}
                  className={`p-1.5 md:p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === 'eraser' ? 'bg-zinc-100 text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`}
                  title="Eraser Tool"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Eraser</span>
                </button>
              </div>

              {/* Pen Smoothness Option (when Pen tool is active) */}
              {activeTool === 'pen' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSmoothnessMenu(prev => !prev)}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                      smoothness === 100
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                        : smoothness > 1
                        ? 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-750'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    title="Pen Smoothness (1-100%, 100% draws straight lines)"
                  >
                    <Spline className="w-3.5 h-3.5" />
                    <span>Smooth:</span>
                    <span className={`font-mono text-xs ${smoothness === 100 ? 'text-amber-200 font-black' : 'text-zinc-200'}`}>
                      {smoothness}%
                    </span>
                    {smoothness === 100 && (
                      <span className="text-[9px] bg-emerald-700/90 px-1 py-0.5 rounded font-black uppercase tracking-wider">
                        Straight
                      </span>
                    )}
                  </button>

                  {/* Smoothness Dropdown Popover */}
                  {showSmoothnessMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setShowSmoothnessMenu(false)} 
                      />
                      <div className="absolute left-0 top-full mt-2 w-72 p-3.5 bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-700 shadow-2xl z-40 text-zinc-200 flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Pen Smoothness</span>
                          </div>
                          <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-full ${
                            smoothness === 100
                              ? 'bg-emerald-500 text-zinc-950 shadow'
                              : 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                          }`}>
                            {smoothness}% {smoothness === 100 ? '• Straight' : ''}
                          </span>
                        </div>

                        {/* Continuous Range Slider 1-100% */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span>Scale (1% - 100%)</span>
                            <span className="font-mono text-[10px] text-zinc-400 font-semibold">
                              {smoothness === 100 ? '📐 Straight Line Mode' : smoothness >= 75 ? 'Streamline Fluid' : smoothness >= 30 ? 'Smooth Curves' : 'Natural Freehand'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSmoothness(prev => Math.max(1, prev - 5))}
                              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-center transition-colors"
                              title="Decrease smoothness by 5%"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              step="1"
                              value={smoothness}
                              onChange={(e) => setSmoothness(Number(e.target.value))}
                              className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => setSmoothness(prev => Math.min(100, prev + 5))}
                              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-center transition-colors"
                              title="Increase smoothness by 5%"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                          {[
                            { label: 'Off', val: 1 },
                            { label: '25%', val: 25 },
                            { label: '50%', val: 50 },
                            { label: '75%', val: 75 },
                            { label: '100% 📐', val: 100 },
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setSmoothness(preset.val)}
                              className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                                smoothness === preset.val
                                  ? 'bg-emerald-500 text-zinc-950 font-black shadow'
                                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Informative Explanation */}
                        <p className="text-[10px] text-zinc-400 bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80 leading-relaxed">
                          💡 <strong className="text-zinc-200">100% Smoothness:</strong> Automatically constrains your pen into drawing straight lines from touch to release. Lower values filter tremors and smooth freehand curves.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Color Customization Palette (Swatches + Custom RGB Color Picker) */}
              {activeTool !== 'eraser' && (
                <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                  {/* Swatches: Highlighter neon palette or full rich palette */}
                  {(activeTool === 'highlighter' ? HIGHLIGHTER_PALETTE : COLOR_PALETTE).map(col => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setActiveColor(col.value)}
                      className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center ${activeColor === col.value ? 'scale-125 border-white ring-2 ring-white/40' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: col.value }}
                      title={col.name}
                    >
                      {activeColor === col.value && (
                        <Check className={`w-2.5 h-2.5 stroke-[3] ${col.value === '#fef08a' || col.value === '#86efac' || col.value === '#67e8f9' ? 'text-zinc-950' : 'text-white'}`} />
                      )}
                    </button>
                  ))}

                  {/* Custom Color Picker input */}
                  <label 
                    className="relative flex items-center justify-center w-5 h-5 rounded-full border border-zinc-700 hover:border-zinc-400 cursor-pointer overflow-hidden bg-gradient-to-tr from-rose-500 via-emerald-400 to-sky-500"
                    title="Custom Color Picker (Choose any color)"
                  >
                    <input
                      type="color"
                      value={activeColor}
                      onChange={(e) => setActiveColor(e.target.value)}
                      className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              )}

              {/* Stroke Thickness */}
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                {STROKE_SIZES.map(sz => (
                  <button
                    key={sz.value}
                    type="button"
                    onClick={() => setStrokeWidth(sz.value)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${strokeWidth === sz.value ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper Background, History & Export */}
            <div className="flex items-center gap-2">
              {/* Paper Background Pattern */}
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPaperBg('lines')}
                  className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${paperBg === 'lines' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Ruled / Lined Page"
                >
                  <FileText className="w-3 h-3" />
                  <span className="hidden sm:inline">Lined</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaperBg('grid')}
                  className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${paperBg === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Grid Page"
                >
                  <Grid className="w-3 h-3" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaperBg('blank')}
                  className={`p-1.5 rounded-lg text-[10px] font-bold ${paperBg === 'blank' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Blank White Page"
                >
                  Blank
                </button>
              </div>

              {/* Undo / Redo / Clear */}
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
                  title="Undo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
                  title="Redo"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  title="Clear Current Page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Export Page as High-Res PNG Image */}
              <button
                type="button"
                onClick={handleDownloadPage}
                className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                title="Download Page as PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Expand / Lightbox Toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Stylus Canvas"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Secondary Sub-Toolbar: Specialized Controls for Shapes or Highlighter */}
          {activeTool === 'shape' && (
            <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-zinc-900/90 border-t border-zinc-800/80 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 shrink-0">
                  <Shapes className="w-3 h-3" /> Shape:
                </span>
                
                {/* Shape Selection Buttons */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setActiveShape('rectangle')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      activeShape === 'rectangle' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Rectangle / Square"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Rectangle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveShape('circle')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      activeShape === 'circle' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Circle / Oval"
                  >
                    <Circle className="w-3.5 h-3.5" />
                    <span>Circle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveShape('arrow')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      activeShape === 'arrow' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Arrow Pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Arrow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveShape('line')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      activeShape === 'line' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Straight Line"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Line</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveShape('triangle')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      activeShape === 'triangle' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Triangle"
                  >
                    <Triangle className="w-3.5 h-3.5" />
                    <span>Triangle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveShape('star')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      activeShape === 'star' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="5-Point Star"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Star</span>
                  </button>
                </div>

                {/* Fill Mode */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 ml-1">
                  <button
                    type="button"
                    onClick={() => setShapeFillMode('outline')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      shapeFillMode === 'outline' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Outline only"
                  >
                    Outline
                  </button>
                  <button
                    type="button"
                    onClick={() => setShapeFillMode('semi')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      shapeFillMode === 'semi' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Semi-transparent color fill"
                  >
                    Tint
                  </button>
                  <button
                    type="button"
                    onClick={() => setShapeFillMode('solid')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      shapeFillMode === 'solid' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Solid opaque color fill"
                  >
                    Solid
                  </button>
                </div>
              </div>

              <span className="hidden md:inline text-[11px] text-zinc-400">
                💡 <span className="text-zinc-300 font-medium">Hold Shift</span> while dragging to constrain proportions (1:1 square/circle).
              </span>
            </div>
          )}

          {activeTool === 'highlighter' && (
            <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-amber-950/20 border-t border-amber-500/20 text-xs">
              <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                <Highlighter className="w-3.5 h-3.5 text-amber-400" />
                <span>Screen Highlighter Active: Translucent multiply blend preserves text and drawings beneath.</span>
              </span>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                Select from bright neon swatches above or use the custom color wheel.
              </span>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-sky-950/20 border-t border-sky-500/20 text-xs">
              <span className="flex items-center gap-1.5 text-sky-300 font-medium">
                <Type className="w-3.5 h-3.5 text-sky-400" />
                <span>Text Note Mode: Click anywhere on the sketch canvas to insert text annotations.</span>
              </span>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                Uses the active color and adjusts font size with stroke thickness.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Multi-Page Navigation Control Bar */}
      {!readOnly && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-xs text-zinc-300">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mr-1 flex items-center gap-1 shrink-0">
              <Layers className="w-3 h-3" /> Pages ({pages.length}):
            </span>
            {pages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSwitchPage(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  pageIndex === idx 
                    ? 'bg-amber-500 text-white shadow-md' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                Page {idx + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={handleAddPage}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1 shrink-0"
              title="Add a new page to this sketch session"
            >
              <Plus className="w-3 h-3" />
              <span>Add Page</span>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => handleSwitchPage(pageIndex - 1)}
              disabled={pageIndex === 0}
              className="p-1 rounded-md text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 bg-zinc-800/80"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-zinc-300 px-1">
              {pageIndex + 1} / {pages.length}
            </span>
            <button
              type="button"
              onClick={() => handleSwitchPage(pageIndex + 1)}
              disabled={pageIndex === pages.length - 1}
              className="p-1 rounded-md text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 bg-zinc-800/80"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {pages.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeletePage(pageIndex)}
                className="p-1 ml-1 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 bg-zinc-800/80"
                title="Delete Current Page"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Canvas Layer Container */}
      <div 
        ref={containerRef} 
        className="relative flex-1 w-full min-h-[440px] md:min-h-[520px] bg-white cursor-crosshair overflow-hidden touch-none select-none"
      >
        {/* Paper Pattern Background Canvas */}
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none block"
          style={{ width: '100%', height: '100%' }}
        />
        {/* Active Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none block"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Floating Text Tool Annotation Input */}
        {textPrompt && (
          <div 
            className="absolute z-30 flex items-center gap-1.5 bg-zinc-900/95 border border-zinc-700 shadow-2xl rounded-xl p-2 backdrop-blur-md"
            style={{ 
              left: Math.min(Math.max(10, textPrompt.x), (containerRef.current?.clientWidth || 600) - 280), 
              top: Math.min(Math.max(10, textPrompt.y - 20), (containerRef.current?.clientHeight || 500) - 60) 
            }}
          >
            <input
              type="text"
              autoFocus
              value={textPrompt.text}
              onChange={(e) => setTextPrompt({ ...textPrompt, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitText();
                if (e.key === 'Escape') setTextPrompt(null);
              }}
              placeholder="Type annotation..."
              className="px-2.5 py-1 text-xs bg-zinc-950 text-white rounded-lg border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-400 w-48 font-medium placeholder-zinc-500"
            />
            <button
              type="button"
              onClick={handleCommitText}
              className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-colors"
              title="Add Text to Canvas (Enter)"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={() => setTextPrompt(null)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Cancel (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Instructions & Active Status */}
      <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span>✏️ Stylus & Touch Enabled</span>
          {activeTool === 'pen' && (
            <span className={`font-medium ${smoothness === 100 ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
              • Smoothness: {smoothness}% {smoothness === 100 ? '(📐 Straight Line Mode Active)' : ''}
            </span>
          )}
          {activeTool === 'shape' && (
            <span className="text-amber-400 font-semibold">
              • Shape Mode: {activeShape.charAt(0).toUpperCase() + activeShape.slice(1)} ({shapeFillMode})
            </span>
          )}
          {activeTool === 'highlighter' && (
            <span className="text-amber-300 font-semibold">
              • Screen Highlighter Active (Multiply Blend)
            </span>
          )}
          {activeTool === 'text' && (
            <span className="text-sky-300 font-semibold">
              • Text Annotation Mode
            </span>
          )}
        </span>
        <span className="font-mono text-[10px] uppercase text-amber-400/80 font-bold">Page {pageIndex + 1} of {pages.length}</span>
      </div>
    </div>
  );
};

