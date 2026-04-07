import { useRef, useEffect, useState } from "react";
import "./Canvas.css";

import { apiUrl, wsUrl } from "../../realtime";

type CanvasProps = React.DetailedHTMLProps<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  HTMLCanvasElement
> & {
  colour: string;
  results?: number;
  onBoardLoadingChange?: (loading: boolean) => void;
};

const BOARD_BYTES = 1000 * 1000 * 3;

const TAP_MAX_MOVE_PX = 16;

const Canvas: React.FC<CanvasProps> = ({ onBoardLoadingChange, ...props }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(props.results || 1);
  }, [props.results]);

  useEffect(() => {
    const contextMenu = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", contextMenu);
    return () => {
      window.removeEventListener("contextmenu", contextMenu);
    };
  }, [zoom]);

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
    const x1 = Math.round((clientX - rect.left) / zoom - 0.5);
    const y1 = Math.round((clientY - rect.top) / zoom - 0.5);
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
    if (e.button !== 0) return;
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!start) return;
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (dist > TAP_MAX_MOVE_PX) return;
    paintAtClient(e.clientX, e.clientY);
  };

  const onPointerCancel = () => {
    pointerDownRef.current = null;
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

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            t?: string;
            x?: number;
            y?: number;
            c?: string;
          };
          if (
            msg.t === "tile" &&
            typeof msg.x === "number" &&
            typeof msg.y === "number" &&
            typeof msg.c === "string"
          ) {
            context.fillStyle = "#" + msg.c.slice(2);
            context.fillRect(msg.x, msg.y, 1, 1);
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
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      width={props.width}
      height={props.height}
      ref={canvasRef}
    />
  );
};

export default Canvas;
