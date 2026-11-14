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
// Satellite above a flame: "satellites spot fires"
export const SatelliteIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="10" y="2.5" width="4" height="5" rx="1" />
    <rect x="2.5" y="3.5" width="5.5" height="3" rx="0.6" />
    <rect x="16" y="3.5" width="5.5" height="3" rx="0.6" />
    <path d="M8 5h2M14 5h2" />
    <path d="M12 21.5c-2.5 0-4-1.7-4-3.8 0-2.3 1.9-3.4 2.5-5.7.9.9 1.4 1.8 1.5 2.9.9-.7 1.4-1.6 1.5-2.7 1.6 1.3 2.5 3.2 2.5 5.1 0 2.5-1.7 4.2-4 4.2Z" />
  </svg>
);
// Uneven bars, then even bars: "line the satellites up"
export const MatchIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M3 20v-5M6 20v-11M9 20v-7" />
    <path d="M15 20v-8M18 20v-8M21 20v-8" />
  </svg>
);
// Calendar with one day marked: "compare with the same week in past years"
export const CalendarIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" />
    <rect x="13" y="13" width="4" height="4" rx="0.8" fill="currentColor" stroke="none" />
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
export const MenuIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
