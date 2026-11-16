import { useEffect, useRef, useState, type CSSProperties } from "react";
export function DissolveText({ children, disabled = false }: { children: string; disabled?: boolean }) {
  const [phase, setPhase] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    setPhase("");
    const control = host.current?.closest("button,a,label");
    const run = () => {
      if (disabled || control?.matches(":disabled,[aria-disabled=true]") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setPhase(p => p ? p : "go");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { setPhase("back"); timer.current = setTimeout(() => setPhase(""), 450); }, 950);
    };
    control?.addEventListener("click", run);
    return () => { clearTimeout(timer.current); control?.removeEventListener("click", run); };
  }, [children, disabled]);
  return <span ref={host}><span className="visually-hidden">{children}</span><span aria-hidden="true" className={`t ${phase}`}>{[...children].map((c,i) => <i key={i} style={{"--dx":`${Math.sin(i*17)*30}px`,"--dy":`${-10-(i*19)%40}px`,"--d":`${(i*73)%260}ms`} as CSSProperties}>{c}</i>)}</span></span>;
}
