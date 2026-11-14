// Mee mark: a flame built from calendar day-cells. Hotter cells sit at the base.
const CELLS: [number, number, string][] = [
  [2, 0, "#F6B44B"],
  [2, 1, "#F6B44B"], [3, 1, "#F3A83B"],
  [1, 2, "#F3A83B"], [2, 2, "#EC7A2C"], [3, 2, "#EC7A2C"],
  [1, 3, "#EC7A2C"], [2, 3, "#E0451B"], [3, 3, "#E0451B"], [4, 3, "#EC7A2C"],
  [0, 4, "#E0451B"], [1, 4, "#C2341A"], [2, 4, "#9A1D0F"], [3, 4, "#C2341A"], [4, 4, "#E0451B"],
];

export function MeeMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {CELLS.map(([cx, cy, fill]) => (
        <rect key={`${cx}-${cy}`} x={cx * 5} y={cy * 5} width="4" height="4" rx="1" fill={fill} />
      ))}
    </svg>
  );
}
