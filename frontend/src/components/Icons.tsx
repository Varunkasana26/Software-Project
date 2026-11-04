// Small inline icons. Decorative: always paired with text.
import type { ReactNode } from "react";

function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const HighIcon = () => <Svg><path d="M8 2 14.5 13.5h-13z" fill="currentColor" /><path d="M8 6.5v3M8 11.6v.1" stroke="#fff" /></Svg>;
export const MediumIcon = () => <Svg><path d="M8 1.8 14.2 8 8 14.2 1.8 8z" /><path d="M8 5.5v3M8 10.6v.1" /></Svg>;
export const LowIcon = () => <Svg><circle cx="8" cy="8" r="6" /><path d="m5.3 8.2 1.9 1.9 3.5-3.9" /></Svg>;
export const NeutralIcon = () => <Svg><circle cx="8" cy="8" r="6" /><path d="M5.5 8h5" /></Svg>;
export const ErrorIcon = () => <Svg><circle cx="8" cy="8" r="6" /><path d="M8 4.8v3.8M8 11v.1" /></Svg>;
export const InfoIcon = () => <Svg><circle cx="8" cy="8" r="6" /><path d="M8 7.3v4M8 5v.1" /></Svg>;
export const ChevronIcon = () => <Svg><path d="m6 3.5 4.5 4.5L6 12.5" /></Svg>;
export const CheckIcon = () => <Svg><path d="m3 8.5 3.3 3.3L13 4.8" /></Svg>;
export const UploadIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M20 27V8M13 14.5 20 8l7 6.5M7 27v5h26v-5" />
  </svg>
);
export const DocIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M10 4h14l8 8v24H10zM24 4v8h8M15 20h12M15 26h12" />
  </svg>
);
