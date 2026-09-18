import type { SVGProps } from "react";

const iconNames = ["add", "arrow_left", "assessment", "close", "dashboard", "edit", "engineering", "filter", "group", "handshake", "history", "history_edu", "inventory", "key", "logout", "menu", "payments", "person_add", "person_check", "person_off", "phone", "post_add", "refresh", "search", "settings", "shield", "tag", "visibility"] as const;

export type IconName = (typeof iconNames)[number];

const paths: Record<IconName, string> = {
  add: "M12 5v14M5 12h14",
  arrow_left: "M19 12H5M11 18l-6-6 6-6",
  assessment: "M5 20V10M12 20V4M19 20v-7M3 20h18",
  close: "M6 6l12 12M18 6L6 18",
  dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  edit: "M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3zM14 7l3 3",
  engineering: "M14.7 6.2a4.3 4.3 0 0 0-5.4 5.4L4.5 16.4a2.1 2.1 0 1 0 3 3l4.8-4.8a4.3 4.3 0 0 0 5.4-5.4l-3.1 3.1-2.8-2.8 2.9-3.3z",
  filter: "M4 5h16M7 12h10M10 19h4M17 16l4 4M21 16l-4 4",
  group: "M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM17 11a3 3 0 0 0 0-6M20 20v-1.5a4.5 4.5 0 0 0-2.5-4.05",
  handshake: "M8.2 11.5 11 14.3a1.7 1.7 0 0 0 2.4 0l1.1-1.1 1.3 1.3a1.7 1.7 0 0 0 2.4 0l1.5-1.5M3 8l3.5-3.5 3.2 1.2h3.6l2-1.2L21 8l-2.5 2.5M3 8l3.2 3.2M21 8l-2.7 2.7M6.2 11.2l2 2M9 13.2l1.8 1.8",
  history: "M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6M12 7v5l3.5 2",
  history_edu: "M5 4h10l4 4v12H5zM15 4v4h4M8 13h8M8 17h5",
  inventory: "M4 7h16v13H4zM3 4h18v3H3zM8 11h8M8 15h5",
  key: "M15 7a4 4 0 1 0-3.8 5.2L4 19.4V21h2v-1.6h1.6v-1.6h1.6l.8-.8A4 4 0 0 0 15 7zM15 9.5h.01",
  logout: "M10 5H5v14h5M14 8l4 4-4 4M9 12h9",
  menu: "M4 6h16M4 12h16M4 18h16",
  payments: "M4 6h16v12H4zM4 10h16M8 15h3",
  person_add: "M15 19v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 3 17.5V19M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 7v6M16 10h6",
  person_check: "M15 19v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 3 17.5V19M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 14l2 2 3-4",
  person_off: "M3 3l18 18M15.5 18.8a4.5 4.5 0 0 0-4-5.8h-3a4.5 4.5 0 0 0-4.4 3.8M9 9a3 3 0 0 1-2.1-5.1M13.2 9.2A3 3 0 0 0 10.8 4",
  phone: "M7 3h3l1 5-2 1.5a14 14 0 0 0 5.5 5.5L16 13l5 1v3c0 1.1-.9 2-2 2C10.2 19 5 13.8 5 5c0-1.1.9-2 2-2z",
  post_add: "M5 4h10l4 4v12H5zM15 4v4h4M8 13h6M11 10v6M8 13h6",
  refresh: "M20 11a8 8 0 1 0 1 4.2M20 4v7h-7",
  search: "m20 20-4.35-4.35M10.8 17a6.2 6.2 0 1 1 0-12.4 6.2 6.2 0 0 1 0 12.4z",
  settings: "M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5zM19.4 13.5a7.7 7.7 0 0 0 .1-1.5 7.7 7.7 0 0 0-.1-1.5l2-1.55-2-3.46-2.35.95a7.8 7.8 0 0 0-2.6-1.5L14.1 2h-4l-.35 2.94a7.8 7.8 0 0 0-2.6 1.5L4.8 5.49l-2 3.46 2 1.55A7.7 7.7 0 0 0 4.7 12c0 .51.04 1.01.1 1.5l-2 1.55 2 3.46 2.35-.95a7.8 7.8 0 0 0 2.6 1.5L10.1 22h4l.35-2.94a7.8 7.8 0 0 0 2.6-1.5l2.35.95 2-3.46-2-1.55z",
  shield: "M12 3 5 6v5c0 4.6 3 8.7 7 10 4-1.3 7-5.4 7-10V6l-7-3zM9 12l2 2 4-4",
  tag: "M4 4h7l9 9-7 7-9-9V4zM8 8h.01",
  visibility: "M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
};

export function Icon({ name, className = "", ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`inline-block size-5 shrink-0 ${className}`} {...props}><path d={paths[name]} /></svg>;
}
