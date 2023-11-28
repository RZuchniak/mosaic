import { useRef, useEffect, useState } from "react";
import "./Canvas.css";

import { socket } from "../../socket";

type CanvasProps = React.DetailedHTMLProps<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  HTMLCanvasElement
>;

const Canvas: React.FC<CanvasProps> = ({ ...props }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  const click = (e: any) => {
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
    context.fillStyle = "red";
    context.fillRect(x1, y1, 1, 1);
    socket.emit("drawtile", x1, y1, "0xff0000");
  };

  useEffect(() => {
    console.log("start");
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    socket.emit("getboard");
    socket.on("giveboard", async (image: Buffer) => {
      const img = new Image();
      img.src = URL.createObjectURL(new Blob([image]));
      img.onload = () => {
        context.drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);
      };
    });

    socket.on("drawtile", (x1, y1, hex) => {
      context.fillStyle = hex;
      context.fillRect(x1, y1, 1, 1);
      console.log("draw tile");
    });
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
