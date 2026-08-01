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
  Layers
} from 'lucide-react';
import { parseSketchPages, formatSketchPages } from '../utils/sketchUtils';

interface SketchCanvasProps {
  initialData?: string;
  onChange?: (dataUrl: string | undefined) => void;
  readOnly?: boolean;
  className?: string;
}

type Tool = 'pen' | 'highlighter' | 'eraser';
type PaperBg = 'blank' | 'grid' | 'lines' | 'dots';

const COLOR_PALETTE = [
  { name: 'Ink Black', value: '#18181b' },
  { name: 'Navy Blue', value: '#1d4ed8' },
  { name: 'Crimson', value: '#dc2626' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Slate Gray', value: '#64748b' },
];

const STROKE_SIZES = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 5 },
  { label: 'Thick', value: 10 },
  { label: 'Broad', value: 18 },
];

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

  // Multi-page state
  const pagesRef = useRef<string[]>(parseSketchPages(initialData));
  const [pages, setPages] = useState<string[]>(pagesRef.current);
  const [pageIndex, setPageIndex] = useState<number>(0);

  // Undo / Redo history stack (for current page)
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const lastPointRef = useRef<{ x: number; y: number; pressure: number } | null>(null);
  const lastMidRef = useRef<{ x: number; y: number } | null>(null);

  // Redraw background pattern (grid, lines, dots) on bgCanvas
  const drawPaperBackground = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    const width = bgCanvas.width;
    const height = bgCanvas.height;

    // Base white page background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (paperBg === 'blank') return;

    ctx.strokeStyle = '#e2e8f0'; // faint gray
    ctx.fillStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    if (paperBg === 'lines') {
      const lineGap = 28;
      for (let y = 40; y < height; y += lineGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#fca5a5';
      ctx.beginPath();
      ctx.moveTo(48, 0);
      ctx.lineTo(48, height);
      ctx.stroke();
    } else if (paperBg === 'grid') {
      const gridSize = 24;
      ctx.beginPath();
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (paperBg === 'dots') {
      const dotGap = 24;
      for (let x = dotGap; x < width; x += dotGap) {
        for (let y = dotGap; y < height; y += dotGap) {
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
    if (!canvas) return '';
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (exportCtx && bgCanvasRef.current) {
      exportCtx.drawImage(bgCanvasRef.current, 0, 0);
      exportCtx.drawImage(canvas, 0, 0);
      return exportCanvas.toDataURL('image/png');
    }
    return '';
  }, []);

  // Save state for active stroke / edit
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(imageData);

    if (newHistory.length > 25) {
      newHistory.shift();
    }

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);

    // Save page content to pages array & notify parent
    const dataUrl = exportCurrentPage();
    pagesRef.current[pageIndex] = dataUrl;
    setPages([...pagesRef.current]);

    if (onChange) {
      onChange(formatSketchPages(pagesRef.current));
    }
  }, [exportCurrentPage, onChange, pageIndex]);

  // Load a image DataURL into active canvas
  const loadPageToCanvas = useCallback((dataUrl?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    historyIndexRef.current = -1;

    if (dataUrl && dataUrl.trim().length > 0) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current = [imageData];
        historyIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
      };
      img.src = dataUrl;
    } else {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [imageData];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, []);

  // Initialize or Resize Canvases
  useEffect(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !bgCanvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const height = Math.max(rect.height || 450, 450);

    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    bgCanvas.width = width * dpr;
    bgCanvas.height = height * dpr;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    bgCanvas.style.width = `${width}px`;
    bgCanvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    const bgCtx = bgCanvas.getContext('2d');
    if (bgCtx) bgCtx.scale(dpr, dpr);

    drawPaperBackground();
    loadPageToCanvas(pagesRef.current[pageIndex]);
  }, [drawPaperBackground, loadPageToCanvas, pageIndex]);

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
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);

    const pos = getPointerPos(e);
    setIsDrawing(true);
    lastPointRef.current = pos;
    lastMidRef.current = { x: pos.x, y: pos.y };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    const radius = activeTool === 'eraser' 
      ? (strokeWidth * 1.5) 
      : activeTool === 'highlighter' 
      ? (strokeWidth * 1.5) 
      : (strokeWidth / 2);

    ctx.arc(pos.x, pos.y, Math.max(1, radius), 0, Math.PI * 2);
    
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = activeColor + '44';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = activeColor;
    }
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly || !lastPointRef.current || !lastMidRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nativeEv = e.nativeEvent as any;
    const coalescedEvents = (nativeEv && typeof nativeEv.getCoalescedEvents === 'function')
      ? nativeEv.getCoalescedEvents()
      : [e];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const ptEv of coalescedEvents) {
      const rect = canvas.getBoundingClientRect();
      const currentPos = {
        x: ptEv.clientX - rect.left,
        y: ptEv.clientY - rect.top,
        pressure: ptEv.pressure > 0 ? ptEv.pressure : 0.5
      };

      const lastPos = lastPointRef.current!;
      const lastMid = lastMidRef.current!;

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
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = strokeWidth * 3;
        ctx.strokeStyle = activeColor + '44';
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

    if (lastPointRef.current && lastMidRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
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
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = strokeWidth * 3;
            ctx.strokeStyle = activeColor + '44';
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = Math.max(1, strokeWidth);
            ctx.strokeStyle = activeColor;
          }
          ctx.stroke();
        }
      }
    }

    setIsDrawing(false);
    lastPointRef.current = null;
    lastMidRef.current = null;
    saveState();
  };

  // Undo / Redo actions
  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
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

      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  return (
    <div className={`flex flex-col bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl ${isFullscreen ? 'fixed inset-4 z-50 m-auto max-w-5xl h-[90vh]' : className}`}>
      {/* Top Main Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-950 border-b border-zinc-800 text-zinc-300">
          {/* Tools & Colors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tool Selection */}
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTool('pen')}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === 'pen' ? 'bg-zinc-100 text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`}
                title="Stylus / Pen"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Pen</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('highlighter')}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === 'highlighter' ? 'bg-amber-400 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'}`}
                title="Highlighter"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span>Highlighter</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('eraser')}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === 'eraser' ? 'bg-zinc-100 text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`}
                title="Eraser"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Eraser</span>
              </button>
            </div>

            {/* Color Palette */}
            {activeTool !== 'eraser' && (
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                {COLOR_PALETTE.map(col => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setActiveColor(col.value)}
                    className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center ${activeColor === col.value ? 'scale-125 border-white ring-2 ring-white/30' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: col.value }}
                    title={col.name}
                  >
                    {activeColor === col.value && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </button>
                ))}
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

          {/* Paper Background & History */}
          <div className="flex items-center gap-2">
            {/* Paper Type */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setPaperBg('lines')}
                className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${paperBg === 'lines' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Ruled / Lined Page"
              >
                <FileText className="w-3 h-3" />
                <span>Lined</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperBg('grid')}
                className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${paperBg === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Grid Page"
              >
                <Grid className="w-3 h-3" />
                <span>Grid</span>
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
        className="relative flex-1 w-full min-h-[380px] bg-white cursor-crosshair overflow-hidden touch-none select-none"
      >
        {/* Paper Pattern Background Canvas */}
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 pointer-events-none"
        />
        {/* Active Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 touch-none"
        />
      </div>

      {/* Footer Instructions */}
      <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
        <span>✏️ Stylus & Touch Enabled (Multi-page drawing active)</span>
        <span className="font-mono text-[10px] uppercase text-amber-400/80 font-bold">Page {pageIndex + 1} of {pages.length}</span>
      </div>
    </div>
  );
};

