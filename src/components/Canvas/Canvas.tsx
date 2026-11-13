import { useRef, useEffect } from "react";
import "./Canvas.css";

import { apiUrl, wsUrl } from "../../realtime";

type CanvasProps = React.DetailedHTMLProps<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  HTMLCanvasElement
> & {
  colour: string;
  results?: number;
  onBoardLoadingChange?: (loading: boolean) => void;
  /** Screen-space pointer movement while primary button is held (used for left-drag pan). */
  onPanDelta?: (movementX: number, movementY: number) => void;
};

type TileChange = { x: number; y: number; c: string };

const BOARD_BYTES = 1000 * 1000 * 3;

const MOUSE_DRAG_THRESHOLD_PX = 4;
const TOUCH_DRAG_THRESHOLD_PX = 10;

type PointerGesture = {
  id: number;
  x: number;
  y: number;
  dragging: boolean;
};

const Canvas: React.FC<CanvasProps> = ({
  onBoardLoadingChange,
  onPanDelta,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const gestureRef = useRef<PointerGesture | null>(null);

  const zoom = props.results || 1;

  useEffect(() => {
    const contextMenu = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", contextMenu);
    return () => {
      window.removeEventListener("contextmenu", contextMenu);
    };
  }, []);

  const paintAtClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x1 = Math.floor((clientX - rect.left) / zoom - canvas.clientLeft);
    const y1 = Math.floor((clientY - rect.top) / zoom - canvas.clientTop);
    if (x1 < 0 || x1 >= canvas.width || y1 < 0 || y1 >= canvas.height) return;
    context.fillStyle = "#" + props.colour.slice(2);
    context.fillRect(x1, y1, 1, 1);
    const payload = JSON.stringify({
      t: "draw",
      x: x1,
      y: y1,
      c: props.colour,
    });
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || !e.isPrimary) return;
    gestureRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const updateGesture = (e: React.PointerEvent<HTMLCanvasElement>, gesture: PointerGesture) => {
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    const threshold = e.pointerType === "touch" ? TOUCH_DRAG_THRESHOLD_PX : MOUSE_DRAG_THRESHOLD_PX;
    if (!gesture.dragging && Math.hypot(dx, dy) < threshold) return;

    gesture.dragging = true;
    gesture.x = e.clientX;
    gesture.y = e.clientY;
    // The stage already handles touch panning and pinch zoom.
    if (e.pointerType !== "touch" && (dx !== 0 || dy !== 0)) onPanDelta?.(dx, dy);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.id === e.pointerId && (e.buttons & 1)) updateGesture(e, gesture);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.id !== e.pointerId || e.button !== 0) return;
    gestureRef.current = null;
    updateGesture(e, gesture);
    if (!gesture.dragging) paintAtClient(e.clientX, e.clientY);
  };

  const cancelGesture = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gestureRef.current?.id === e.pointerId) {
      gestureRef.current = null;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function applyBoardBuffer(buf: ArrayBuffer) {
      if (buf.byteLength !== BOARD_BYTES) {
        console.error("Unexpected board size", buf.byteLength);
        return;
      }
      const rgb = new Uint8Array(buf);
      const img = context.createImageData(1000, 1000);
      const d = img.data;
      for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
        d[j] = rgb[i];
        d[j + 1] = rgb[i + 1];
        d[j + 2] = rgb[i + 2];
        d[j + 3] = 255;
      }
      context.putImageData(img, 0, 0);
    }

    async function loadBoard(): Promise<void> {
      onBoardLoadingChange?.(true);
      try {
        const res = await fetch(apiUrl("/api/board"));
        if (!res.ok) {
          throw new Error(`board fetch failed: ${res.status}`);
        }
        const buf = await res.arrayBuffer();
        if (!cancelled) {
          applyBoardBuffer(buf);
        }
      } finally {
        if (!cancelled) {
          onBoardLoadingChange?.(false);
        }
      }
    }

    function connectWs() {
      if (cancelled) {
        return;
      }
      const ws = new WebSocket(wsUrl("/ws"));
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ t: "subscribe-batch" }));

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as Partial<TileChange> & {
            t?: string;
            tiles?: Partial<TileChange>[];
          };
          const tiles = msg?.t === "tiles" && Array.isArray(msg.tiles)
            ? msg.tiles
            : msg?.t === "tile" ? [msg] : [];
          for (const tile of tiles) {
            if (typeof tile?.x === "number" && typeof tile.y === "number" && typeof tile.c === "string") {
              context.fillStyle = "#" + tile.c.slice(2);
              context.fillRect(tile.x, tile.y, 1, 1);
            }
          }
        } catch {
          /* ignore malformed */
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (cancelled) {
          return;
        }
        void loadBoard().finally(() => {
          if (!cancelled) {
            reconnectTimer = setTimeout(connectWs, 2000);
          }
        });
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    void loadBoard()
      .then(() => {
        if (!cancelled) {
          connectWs();
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          onBoardLoadingChange?.(false);
          reconnectTimer = setTimeout(() => {
            void loadBoard().then(() => {
              if (!cancelled) {
                connectWs();
              }
            });
          }, 3000);
        }
      });

    return () => {
      cancelled = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [onBoardLoadingChange]);

  return (
    <canvas
      id={props.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancelGesture}
      onLostPointerCapture={cancelGesture}
      width={props.width}
      height={props.height}
      ref={canvasRef}
    />
  );
};

export default Canvas;
