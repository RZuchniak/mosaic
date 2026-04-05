import "./App.css";
import Canvas from "./components/Canvas/Canvas";
import { useEffect, useState } from "react";

import Selector from "./components/Selector/Selector";
import { AboutPanel, PortfolioPanel } from "./components/CornerPanels/CornerPanels";

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 11.03;

function initialFitZoom(): number {
  const padX = 48;
  const padY = 200;
  const w = Math.max(320, window.innerWidth - padX);
  const h = Math.max(240, window.innerHeight - padY);
  const fit = Math.min(w / 1000, h / 1000);
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, fit));
  return Math.round(clamped * 100) / 100;
}

function App() {
  const [zoom, setZoom] = useState(initialFitZoom);
  const [colour, setColour] = useState("0xff0000");

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const next = z + e.deltaY * -0.002;
        return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)) * 100) / 100;
      });
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="App mspaint-app">
      <header className="mspaint-app__titlebar">
        <span className="mspaint-app__title">Mosaic</span>
      </header>
      <div className="mspaint-app__client">
        <AboutPanel />
        <PortfolioPanel />
        <div className="canvas-stage">
          <div className="scaler" style={{ transform: `scale(${zoom})` }}>
            <Canvas id="canvas" width={1000} height={1000} results={zoom} colour={colour} />
          </div>
        </div>
        <div className="selector">
          <Selector colour={colour} setColour={setColour} />
        </div>
      </div>
    </div>
  );
}

export default App;
