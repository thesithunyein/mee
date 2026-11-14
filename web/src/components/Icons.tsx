type P = { className?: string };
const base = {
  width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};

export const SearchIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const DownloadIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" /></svg>
);
export const BackIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M15 6l-6 6 6 6" /></svg>
);
export const ChevronIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M9 6l6 6-6 6" /></svg>
);
// Satellite: body with two solar panels
export const SatelliteIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" transform="rotate(45 12 12)" />
    <path d="M7.8 7.8 4.6 4.6M3 7.5l4.5-4.5M16.2 16.2l3.2 3.2M16.5 21l4.5-4.5" />
  </svg>
);
// Scales: matching sensors to one unit
export const MatchIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 4v16M6 20h12M5 8h14M5 8l-2.5 6h5L5 8Zm14 0-2.5 6h5L19 8Z" /></svg>
);
export const CalendarIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="M8 14h2M12 14h2M16 14h0.5M8 17h2" />
  </svg>
);
// Paper plane (messaging)
export const SendIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M21 3 3 10.5l7 2.5m11-10-8 18-3-8m11-10L10 13" /></svg>
);
// Location target
export const LocateIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
);
