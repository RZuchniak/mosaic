import { useRef, useEffect, useState } from "react";
import "./Canvas.css";

import { apiUrl, wsUrl } from "../../realtime";

type CanvasProps = React.DetailedHTMLProps<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  HTMLCanvasElement
> & { colour: string; results?: number };

const BOARD_BYTES = 1000 * 1000 * 3;

const Canvas: React.FC<CanvasProps> = ({ ...props }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [zoom, setZoom] = useState(1);

  const [locationX, setLocationX] = useState(0);
  const [locationY, setLocationY] = useState(0);

  function move(e: React.MouseEvent) {
    if (e.buttons === 2) {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      setLocationX(Math.max(0, Math.min(locationX + e.movementX / zoom, 1000)));
      setLocationY(
        Math.max(-550, Math.min(locationY + e.movementY / zoom, 450))
      );
      canvas.style.transform = `translate(${locationX}px, ${locationY}px)`;
    }
  }

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

  const click = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const x = e.clientX;
    const y = e.clientY;

    const rect = canvas.getBoundingClientRect();
    const x1 = Math.round((x - rect.left) / zoom - 0.5);
    const y1 = Math.round((y - rect.top) / zoom - 0.5);
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
      const res = await fetch(apiUrl("/api/board"));
      if (!res.ok) {
        throw new Error(`board fetch failed: ${res.status}`);
      }
      const buf = await res.arrayBuffer();
      if (!cancelled) {
        applyBoardBuffer(buf);
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
  }, []);

  return (
    <canvas
      onClick={click}
      width={props.width}
      height={props.height}
      ref={canvasRef}
      onMouseMove={move}
    />
  );
};

export default Canvas;
