import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
export function useSpringIndicator(activeElementRef: RefObject<HTMLElement | null>, key: string) {
  const indicator = useRef<HTMLSpanElement>(null);
  const state = useRef({x:0,w:0,vx:0,vw:0,first:true});
  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      const el = activeElementRef.current, ind = indicator.current;
      if (!el || !ind) return;
      const tx = el.offsetLeft, tw = el.offsetWidth, s = state.current;
      const snap = () => { Object.assign(s,{x:tx,w:tw,vx:0,vw:0,first:false}); ind.style.width=`${tw}px`; ind.style.transform=`translateX(${tx}px)`; };
      if (s.first || matchMedia("(prefers-reduced-motion: reduce)").matches) return snap();
      const tick = () => {
        s.vx=(s.vx+(tx-s.x)*.16)*.74; s.vw=(s.vw+(tw-s.w)*.16)*.74; s.x+=s.vx; s.w+=s.vw;
        ind.style.width=`${s.w}px`; ind.style.transform=`translateX(${s.x}px) scaleX(${1+Math.min(.4,Math.abs(s.vx)/50)})`;
        if(Math.abs(s.vx)+Math.abs(s.vw)+Math.abs(tx-s.x)+Math.abs(tw-s.w)>.1) frame=requestAnimationFrame(tick); else snap();
      }; tick();
    };
    update(); const observer = new ResizeObserver(update);
    if(activeElementRef.current?.parentElement) observer.observe(activeElementRef.current.parentElement);
    window.addEventListener("resize",update);
    return () => {cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize",update);};
  },[activeElementRef,key]);
  return indicator;
}
export function useCountUp(target: number) {
  const [value,setValue]=useState(0);
  useEffect(()=>{ if(matchMedia("(prefers-reduced-motion: reduce)").matches){setValue(target);return;} let frame=0; const start=performance.now(); const tick=(now:number)=>{const p=Math.min(1,(now-start)/1400);setValue(target*(1-(1-p)**3));if(p<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[target]);
  return value;
}
