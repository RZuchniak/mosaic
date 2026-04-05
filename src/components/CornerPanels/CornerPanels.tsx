import { useState } from "react";

export function AboutPanel() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        className="mspaint-flyout mspaint-flyout--collapsed"
        onClick={() => setOpen(true)}
        aria-label="Show how Mosaic works"
      >
        ?
      </button>
    );
  }

  return (
    <aside
      className="mspaint-win mspaint-win--about"
      aria-label="About Mosaic"
    >
      <div className="mspaint-win__titlebar">
        <span className="mspaint-win__title">Help</span>
        <button
          type="button"
          className="mspaint-win__close"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <span className="mspaint-win__close-icon" aria-hidden>
            ×
          </span>
        </button>
      </div>
      <div className="mspaint-win__body">
        <div className="mspaint-win__inset">
          <p className="mspaint-win__text">
            A shared 1000×1000 canvas inspired by r/place. Pick a colour, click a
            tile to paint it, and everyone sees updates live. Scroll to zoom,
            right-drag to pan.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function PortfolioPanel() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        className="mspaint-flyout mspaint-flyout--collapsed mspaint-flyout--right"
        onClick={() => setOpen(true)}
        aria-label="Show portfolio link"
      >
        →
      </button>
    );
  }

  return (
    <aside className="mspaint-win mspaint-win--portfolio" aria-label="Portfolio">
      <div className="mspaint-win__titlebar">
        <span className="mspaint-win__title">About</span>
        <button
          type="button"
          className="mspaint-win__close"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <span className="mspaint-win__close-icon" aria-hidden>
            ×
          </span>
        </button>
      </div>
      <div className="mspaint-win__body">
        <div className="mspaint-win__inset">
          <p className="mspaint-win__text mspaint-win__text--right">
            Built by{" "}
            <a
              href="https://robertzuchniak.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mspaint-win__link"
            >
              Robert Zuchniak
            </a>
            .
          </p>
        </div>
      </div>
    </aside>
  );
}
