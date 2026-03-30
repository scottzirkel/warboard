'use client';

interface DeploymentMapImageProps {
  deploymentId: string;
  deploymentName: string;
  className?: string;
}

// 40k table is 60"x44" for Strike Force. SVG viewBox is 600x440 (10px per inch)
// Each deployment defines zones and dimension labels
interface DeploymentZone {
  player: string;
  opponent: string;
  labels: { text: string; x: number; y: number; rotate?: number }[];
}

const deploymentZones: Record<string, DeploymentZone> = {
  // Dawn of War: 12" strips along long edges
  'dawn-of-war': {
    player: 'M 0 320 L 600 320 L 600 440 L 0 440 Z',
    opponent: 'M 0 0 L 600 0 L 600 120 L 0 120 Z',
    labels: [
      { text: '12"', x: -5, y: 60, rotate: -90 },
      { text: '12"', x: -5, y: 380, rotate: -90 },
      { text: '20"', x: -5, y: 220, rotate: -90 },
      { text: '60"', x: 300, y: 435 },
    ],
  },
  // Hammer and Anvil: 24" zones on short edges
  'hammer-and-anvil': {
    player: 'M 0 0 L 240 0 L 240 440 L 0 440 Z',
    opponent: 'M 360 0 L 600 0 L 600 440 L 360 440 Z',
    labels: [
      { text: '24"', x: 120, y: 435 },
      { text: '24"', x: 480, y: 435 },
      { text: '12"', x: 300, y: 435 },
      { text: '44"', x: -5, y: 220, rotate: -90 },
    ],
  },
  // Search and Destroy: diagonal quarters, 9" from center
  'search-and-destroy': {
    player: 'M 0 220 L 210 220 L 210 440 L 0 440 Z',
    opponent: 'M 390 0 L 600 0 L 600 220 L 390 220 Z',
    labels: [
      { text: '21"', x: 105, y: 435 },
      { text: '22"', x: -5, y: 330, rotate: -90 },
      { text: '9"', x: 300, y: 215 },
      { text: '9"', x: 300, y: 240 },
    ],
  },
  // Sweeping Engagement: offset rectangles
  'sweeping-engagement': {
    player: 'M 0 260 L 390 260 L 390 440 L 0 440 Z',
    opponent: 'M 210 0 L 600 0 L 600 180 L 210 180 Z',
    labels: [
      { text: '18"', x: -5, y: 350, rotate: -90 },
      { text: '39"', x: 195, y: 435 },
      { text: '18"', x: 605, y: 90, rotate: 90 },
      { text: '39"', x: 405, y: 15 },
    ],
  },
  // Tipping Point: center strip vs two corners
  'tipping-point': {
    player: 'M 180 0 L 420 0 L 420 440 L 180 440 Z',
    opponent: 'M 0 0 L 180 0 L 180 180 L 0 180 Z M 420 260 L 600 260 L 600 440 L 420 440 Z',
    labels: [
      { text: '24"', x: 300, y: 435 },
      { text: '18"', x: 90, y: 15 },
      { text: '18"', x: -5, y: 90, rotate: -90 },
      { text: '18"', x: 510, y: 435 },
      { text: '18"', x: 605, y: 350, rotate: 90 },
    ],
  },
  // Crucible of Battle: wedge shapes
  'crucible-of-battle': {
    player: 'M 0 320 L 300 220 L 600 320 L 600 440 L 0 440 Z',
    opponent: 'M 0 0 L 0 120 L 300 220 L 600 120 L 600 0 Z',
    labels: [
      { text: '12"', x: -5, y: 60, rotate: -90 },
      { text: '12"', x: -5, y: 380, rotate: -90 },
      { text: '60"', x: 300, y: 435 },
    ],
  },
};

export function DeploymentMapImage({ deploymentId, deploymentName, className = '' }: DeploymentMapImageProps) {
  const zone = deploymentZones[deploymentId];

  if (!zone) return null;

  return (
    <div className={`text-center ${className}`}>
      <svg
        viewBox="-30 -10 660 460"
        className="w-full max-w-[280px] mx-auto"
        role="img"
        aria-label={`${deploymentName} deployment map`}
      >
        {/* Table background */}
        <rect x="0" y="0" width="600" height="440" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {/* Center lines */}
        <line x1="300" y1="0" x2="300" y2="440" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="6 4" />
        <line x1="0" y1="220" x2="600" y2="220" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="6 4" />

        {/* Player zone */}
        <path d={zone.player} fill="rgba(59,130,246,0.2)" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" />

        {/* Opponent zone */}
        <path d={zone.opponent} fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5" />

        {/* Dimension labels */}
        {zone.labels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            fill="rgba(255,255,255,0.45)"
            fontSize="18"
            fontFamily="monospace"
            transform={label.rotate ? `rotate(${label.rotate}, ${label.x}, ${label.y})` : undefined}
          >
            {label.text}
          </text>
        ))}

        {/* Zone labels */}
        <text x="300" y="405" textAnchor="middle" fill="rgba(59,130,246,0.6)" fontSize="20" fontWeight="bold">You</text>
        <text x="300" y="45" textAnchor="middle" fill="rgba(239,68,68,0.5)" fontSize="20" fontWeight="bold">Opponent</text>
      </svg>
      <p className="text-xs text-white/50 mt-1">{deploymentName}</p>
    </div>
  );
}
