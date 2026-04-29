import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "./Selector.css";

type SelectorProps = {
  colour: string;
  setColour: (colour: string) => void;
  isMobileLayout: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

/** Normalise to `0xrrggbb` for the API and canvas. */
export function normalizeSocketColour(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1).replace(/[^0-9a-fA-F]/g, "");
    if (hex.length === 3) {
      const [r, g, b] = hex.split("");
      return `0x${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    if (hex.length >= 6) {
      return `0x${hex.slice(0, 6).toLowerCase()}`;
    }
  }
  const m = trimmed.match(/^0x([0-9a-fA-F]{6})$/i);
  if (m) {
    return `0x${m[1].toLowerCase()}`;
  }
  return "0x000000";
}

function colourInputValue(socketColour: string): string {
  const hex = normalizeSocketColour(socketColour).replace(/^0x/, "");
  return `#${hex.padStart(6, "0")}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

const PRESETS: { value: string; label: string }[] = [
  { value: "0x000000", label: "Black" },
  { value: "0xffffff", label: "White" },
  { value: "0x808080", label: "Gray" },
  { value: "0xc0c0c0", label: "Silver" },
  { value: "0xff0000", label: "Red" },
  { value: "0xff6600", label: "Orange" },
  { value: "0xffcc00", label: "Gold" },
  { value: "0xffff00", label: "Yellow" },
  { value: "0x00ff00", label: "Green" },
  { value: "0x00cc88", label: "Teal" },
  { value: "0x00aaff", label: "Sky" },
  { value: "0x0000ff", label: "Blue" },
  { value: "0x6600ff", label: "Violet" },
  { value: "0xff00cc", label: "Magenta" },
  { value: "0x8b4513", label: "Brown" },
  { value: "0xffc0cb", label: "Pink" },
  { value: "0x40e0d0", label: "Turquoise" },
  { value: "0x36454f", label: "Charcoal" },
];

function Selector({
  colour,
  setColour,
  isMobileLayout,
  mobileOpen,
  onMobileOpenChange,
}: SelectorProps) {
  const active = normalizeSocketColour(colour);
  const hexDisplay = active.slice(2);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragActiveRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /** Matches `.selector { bottom: ... }` in Selector.css (desktop). */
  const SELECTOR_BOTTOM_OFFSET = 10;
  const VIEW_MARGIN = 6;

  const clampDragOffset = useCallback((dx: number, dy: number) => {
    const el = panelRef.current;
    if (!el) return { x: dx, y: dy };
    const client = el.closest(".mspaint-app__client");
    if (!(client instanceof HTMLElement)) return { x: dx, y: dy };

    const cr = client.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w < 1 || h < 1) return { x: dx, y: dy };

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const m = VIEW_MARGIN;
    const b = SELECTOR_BOTTOM_OFFSET;

    const minDx = m - cr.left - cr.width / 2 + w / 2;
    const maxDx = vw - m - cr.left - cr.width / 2 - w / 2;
    const minDy = m - cr.bottom + b + h;
    const maxDy = vh - m - cr.bottom + b;

    const loX = Math.min(minDx, maxDx);
    const hiX = Math.max(minDx, maxDx);
    const loY = Math.min(minDy, maxDy);
    const hiY = Math.max(minDy, maxDy);

    return {
      x: clamp(dx, loX, hiX),
      y: clamp(dy, loY, hiY),
    };
  }, []);

  useEffect(() => {
    if (isMobileLayout) {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isMobileLayout]);

  useEffect(() => {
    if (isMobileLayout) return;
    const onResize = () => {
      setDragOffset((d) => clampDragOffset(d.x, d.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isMobileLayout, clampDragOffset]);

  const onTitlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (isMobileLayout) return;
      if (e.button !== 0) return;
      e.preventDefault();
      dragActiveRef.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isMobileLayout]
  );

  const onTitlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragActiveRef.current) return;
      setDragOffset((d) => {
        const nx = d.x + e.movementX;
        const ny = d.y + e.movementY;
        return clampDragOffset(nx, ny);
      });
    },
    [clampDragOffset]
  );

  const onTitlePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const peekTab = isMobileLayout && !mobileOpen && (
    <button
      type="button"
      className="selector selector--peek-tab"
      onClick={() => onMobileOpenChange(true)}
      aria-label="Open colour picker"
    >
      <span
        className="selector-palette__peek-swatch"
        style={{ backgroundColor: `#${hexDisplay}` }}
        aria-hidden
      />
      <span className="selector-palette__peek-label">Colours</span>
    </button>
  );

  const panel =
    (!isMobileLayout || mobileOpen) && (
      <div
        ref={panelRef}
        className={
          "selector" + (isMobileLayout ? " selector--sheet-mobile" : "")
        }
        style={
          isMobileLayout
            ? undefined
            : {
                transform: `translate(calc(-50% + ${dragOffset.x}px), ${dragOffset.y}px)`,
              }
        }
      >
        <div className="mspaint-win mspaint-win--palette" role="group" aria-label="Colour">
          <div
            className={
              "mspaint-win__titlebar" +
              (!isMobileLayout ? " selector-palette__titlebar--draggable" : "")
            }
            onPointerDown={onTitlePointerDown}
            onPointerMove={onTitlePointerMove}
            onPointerUp={onTitlePointerUp}
            onPointerCancel={onTitlePointerUp}
          >
            <span className="mspaint-win__title">Edit Colours</span>
            {isMobileLayout && (
              <button
                type="button"
                className="mspaint-win__close"
                onClick={(e) => {
                  e.stopPropagation();
                  onMobileOpenChange(false);
                }}
                aria-label="Close colour picker"
              >
                <span className="mspaint-win__close-icon" aria-hidden>
                  ×
                </span>
              </button>
            )}
          </div>
          <div className="mspaint-win__body">
            <div className="mspaint-win__inset selector-palette__inset">
              <div className="selector-palette__custom">
                <span className="selector-palette__label">Custom</span>
                <div className="selector-palette__color-well">
                  <input
                    type="color"
                    className="selector-palette__color-input"
                    value={colourInputValue(active)}
                    onChange={(e) =>
                      setColour(normalizeSocketColour(e.target.value))
                    }
                    aria-label="Pick any colour"
                  />
                </div>
              </div>
              <div className="selector-palette__swatches" role="list">
                {PRESETS.map((c) => {
                  const norm = normalizeSocketColour(c.value);
                  const selected = norm === active;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      role="listitem"
                      title={c.label}
                      aria-label={c.label}
                      aria-pressed={selected}
                      className={`selector-palette__swatch${selected ? " selector-palette__swatch--selected" : ""}`}
                      style={{ backgroundColor: `#${norm.slice(2)}` }}
                      onClick={() => setColour(norm)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <>
      {peekTab}
      {panel}
    </>
  );
}

export default Selector;
