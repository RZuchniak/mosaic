import "./App.css";
import Canvas from "./components/Canvas/Canvas";
import { useCallback, useEffect, useRef, useState } from "react";

import Selector from "./components/Selector/Selector";
import { AboutPanel, PortfolioPanel } from "./components/CornerPanels/CornerPanels";

const ZOOM_MIN = 0.25;
const ZOOM_MAX_DESKTOP = 16;
const ZOOM_MAX_MOBILE = 28;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function initialFitZoom(): number {
  const padX = 48;
  const padY = 200;
  const w = Math.max(320, window.innerWidth - padX);
  const h = Math.max(240, window.innerHeight - padY);
  const fit = Math.min(w / 1000, h / 1000);
  const clamped = Math.min(ZOOM_MAX_DESKTOP, Math.max(ZOOM_MIN, fit));
  return Math.round(clamped * 100) / 100;
}

function App() {
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const stageSizeRef = useRef({ width: 0, height: 0 });
  const [isNarrowViewport, setIsNarrowViewport] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false
  );
  const [mobileColourPanelOpen, setMobileColourPanelOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 768px)").matches;
  });
  const stageDragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinchRef = useRef<{ initialDist: number; initialZoom: number } | null>(
    null
  );
  /** One-finger drag pan (touch) */
  const touchPanRef = useRef<{ lastX: number; lastY: number } | null>(null);

  const [zoom, setZoom] = useState(initialFitZoom);
  const zoomRef = useRef(zoom);
  const [zoomMax, setZoomMax] = useState(ZOOM_MAX_DESKTOP);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [colour, setColour] = useState("0xff0000");
  const [boardLoading, setBoardLoading] = useState(true);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => {
      setZoomMax(mq.matches ? ZOOM_MAX_MOBILE : ZOOM_MAX_DESKTOP);
      setIsNarrowViewport(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!isNarrowViewport) {
      setMobileColourPanelOpen(true);
    }
  }, [isNarrowViewport]);

  const applyPanDelta = useCallback((dx: number, dy: number) => {
    const { width, height } = stageSizeRef.current;
    const z = zoomRef.current;
    const maxPanX = Math.max(0, (1000 - width / z) / 2);
    const maxPanY = Math.max(0, (1000 - height / z) / 2);
    setPanX((x) => clamp(x + dx / z, -maxPanX, maxPanX));
    setPanY((y) => clamp(y + dy / z, -maxPanY, maxPanY));
  }, []);

  useEffect(() => {
    applyPanDelta(0, 0);
  }, [applyPanDelta, zoom]);

  useEffect(() => {
    const stage = canvasStageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(([entry]) => {
      stageSizeRef.current = entry.contentRect;
      applyPanDelta(0, 0);
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [applyPanDelta]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const factor = Math.exp(-e.deltaY * 0.00115);
        const next = z * factor;
        return Math.round(Math.min(zoomMax, Math.max(ZOOM_MIN, next)) * 100) / 100;
      });
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [zoomMax]);

  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !e.isPrimary || e.pointerType === "touch") return;
    if (e.target instanceof HTMLCanvasElement) return;
    e.preventDefault();
    stageDragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = stageDragRef.current;
    if (drag?.id !== e.pointerId || !(e.buttons & 1)) return;
    applyPanDelta(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
  };

  const endStagePan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stageDragRef.current?.id === e.pointerId) {
      stageDragRef.current = null;
    }
  };

  const touchDist = (t: TouchList) => {
    const a = t[0];
    const b = t[1];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  useEffect(() => {
    const el = canvasStageRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        touchPanRef.current = null;
        const d = touchDist(e.touches);
        if (d > 1) {
          pinchRef.current = {
            initialDist: d,
            initialZoom: zoomRef.current,
          };
        }
      } else if (e.touches.length === 1) {
        touchPanRef.current = {
          lastX: e.touches[0].clientX,
          lastY: e.touches[0].clientY,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        touchPanRef.current = null;
        if (!pinchRef.current) return;
        e.preventDefault();
        const d = touchDist(e.touches);
        const { initialDist, initialZoom } = pinchRef.current;
        if (d < 1 || initialDist < 1) return;
        const next = initialZoom * (d / initialDist);
        const clamped =
          Math.round(Math.min(zoomMax, Math.max(ZOOM_MIN, next)) * 100) / 100;
        setZoom(clamped);
        return;
      }

      if (e.touches.length === 1 && touchPanRef.current) {
        const t = e.touches[0];
        const dx = t.clientX - touchPanRef.current.lastX;
        const dy = t.clientY - touchPanRef.current.lastY;
        touchPanRef.current.lastX = t.clientX;
        touchPanRef.current.lastY = t.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 0) {
          e.preventDefault();
        }
        applyPanDelta(dx, dy);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current = null;
      }
      if (e.touches.length === 0) {
        touchPanRef.current = null;
      } else if (e.touches.length === 1) {
        touchPanRef.current = {
          lastX: e.touches[0].clientX,
          lastY: e.touches[0].clientY,
        };
      }
    };

    const opts: AddEventListenerOptions = { passive: false };
    el.addEventListener("touchstart", onTouchStart, opts);
    el.addEventListener("touchmove", onTouchMove, opts);
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart, opts);
      el.removeEventListener("touchmove", onTouchMove, opts);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [applyPanDelta, zoomMax]);

  return (
    <div className="App mspaint-app">
      <header className="mspaint-app__titlebar">
        <span className="mspaint-app__title">Mosaic</span>
      </header>
      <div
        className={
          "mspaint-app__client" +
          (isNarrowViewport && !mobileColourPanelOpen
            ? " mspaint-app__client--palette-collapsed-mobile"
            : "")
        }
      >
        <AboutPanel />
        <PortfolioPanel />
        <div
          ref={canvasStageRef}
          className="canvas-stage"
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={endStagePan}
          onPointerCancel={endStagePan}
          onLostPointerCapture={endStagePan}
        >
          {boardLoading && (
            <div className="canvas-loading" aria-live="polite" aria-busy="true">
              <div className="canvas-loading__box">
                <span className="canvas-loading__text">Loading board…</span>
              </div>
            </div>
          )}
          <div
            className="canvas-pan"
            style={{ transform: `translate(${panX * zoom}px, ${panY * zoom}px)` }}
          >
            <div className="scaler" style={{ transform: `scale(${zoom})` }}>
              <Canvas
                id="canvas"
                width={1000}
                height={1000}
                results={zoom}
                colour={colour}
                onBoardLoadingChange={setBoardLoading}
                onPanDelta={applyPanDelta}
              />
            </div>
          </div>
        </div>
        <Selector
          colour={colour}
          setColour={setColour}
          isMobileLayout={isNarrowViewport}
          mobileOpen={mobileColourPanelOpen}
          onMobileOpenChange={setMobileColourPanelOpen}
        />
      </div>
    </div>
  );
}

export default App;
