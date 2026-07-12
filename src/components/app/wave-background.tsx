import { Waves } from "@indhu_hehhehe/wave-background";

export function WaveBackground() {
  return (
    <Waves
      xGap={15}
      yGap={15}
      waveX={15}
      waveY={10}
      palette={[[40, 50, 100], [50, 60, 120], [35, 45, 90]]}
      frameInterval={100}
      maskImage="none"
    />
  );
}
