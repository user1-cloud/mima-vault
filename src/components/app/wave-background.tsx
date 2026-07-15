import { useState, useEffect } from "react";
import { Waves } from "@indhu_hehhehe/wave-background";

const DARK_PALETTE: [number, number, number][] = [[40, 50, 100], [50, 60, 120], [35, 45, 90]];
const LIGHT_PALETTE: [number, number, number][] = [[200, 205, 215], [190, 195, 210], [210, 215, 220]];

function buildPalette(): [number, number, number][] {
  return document.documentElement.classList.contains("dark") ? DARK_PALETTE : LIGHT_PALETTE;
}

export function WaveBackground() {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const bump = () => setKey((k) => k + 1);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") bump();
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    mq.addEventListener("change", bump);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", bump);
    };
  }, []);

  return (
    <Waves
      key={key}
      xGap={15}
      yGap={15}
      waveX={15}
      waveY={10}
      palette={buildPalette()}
      frameInterval={50}
      maskImage="none"
    />
  );
}
