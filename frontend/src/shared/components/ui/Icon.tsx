/** Set de iconos del producto. Trazo de 1.7, viewBox 24×24, hereda currentColor. */
export const ICONS = {
  // ── rail: trabajo diario ──
  home: 'M3 11.2 12 4l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  cases: 'M5 3h9l5 5v13H5zM14 3v5h5M8 13h8M8 17h5',
  deadlines: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  clients: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1a4 4 0 0 0-3-3.9M16 4.1a4 4 0 0 1 0 7.8',
  templates: 'M4 4h10l4 4v12H4zM14 4v4h4M8 12h6M8 16h6',
  tools: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  // ── rail: administración ──
  users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19 8v6M22 11h-6',
  lawyers: 'M12 3 3 7l9 4 9-4zM3 12l9 4 9-4M3 17l9 4 9-4',
  timeLimits: 'M4 5h16M4 12h16M4 19h9M18 16v6M15 19h6',
  qualifications: 'M12 3v18M8 21h8M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
  reports: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  // ── acciones ──
  search: 'M18 18l-3.5-3.5M4 11a7 7 0 1 0 14 0 7 7 0 0 0-14 0z',
  notifications: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  password: 'M4 11h16v10H4zM8 11V7a4 4 0 0 1 8 0v4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  plus: 'M12 5v14M5 12h14',
  alert: 'M12 8v4M12 16h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  external: 'M7 17 17 7M8 7h9v9',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  chevronDown: 'M6 9l6 6 6-6',
  back: 'M15 18l-6-6 6-6',
  forward: 'M9 18l6-6-6-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  filter: 'M3 5h18l-7 8.5V19l-4 2v-7.5z',
  // ── contenido ──
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
} as const;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  /** lado del cuadrado en px */
  size?: number;
  className?: string;
}

/** El color sale de currentColor: lo define el contenedor, no el icono. */
export function Icon({ name, size = 17, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: `0 0 ${size}px` }}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
