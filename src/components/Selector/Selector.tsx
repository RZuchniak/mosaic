import "./Selector.css";

type SelectorProps = {
  colour: string;
  setColour: (colour: string) => void;
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

function Selector({ colour, setColour }: SelectorProps) {
  const active = normalizeSocketColour(colour);

  return (
    <div className="mspaint-win mspaint-win--palette" role="group" aria-label="Colour">
      <div className="mspaint-win__titlebar">
        <span className="mspaint-win__title">Edit Colours</span>
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
                onChange={(e) => setColour(normalizeSocketColour(e.target.value))}
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
  );
}

export default Selector;
