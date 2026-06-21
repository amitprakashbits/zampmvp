import { useEffect, useRef, useState } from "react";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export const stamp = () => {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/** Smooth count-up for the one number the agent owns.
 *  Animates with rAF when visible; a timeout fallback guarantees the final
 *  value lands even when rAF is throttled (e.g. a backgrounded tab). */
export function useCountUp(target: number) {
  const [val, setVal] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const from = ref.current;
    if (from === target) return;
    ref.current = target;
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setVal(from + (target - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Safety net: if rAF never fires (throttled/hidden tab), still settle.
    const settle = setTimeout(() => setVal(target), dur + 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [target]);
  return val;
}
