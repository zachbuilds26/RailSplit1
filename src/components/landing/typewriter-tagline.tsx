"use client";

import { useEffect, useState } from "react";

const TEXT = "Create link. Share link. Get paid.";

/**
 * Types the tagline out, holds it, then erases it and starts again.
 * Under reduced motion it simply shows the full line.
 */
export function TypewriterTagline() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let chars = 0;
    let direction: 1 | -1 = 1;

    const step = () => {
      if (cancelled) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setCount(TEXT.length);
        return;
      }

      chars += direction;
      setCount(chars);

      if (chars >= TEXT.length) {
        direction = -1;
        timer = setTimeout(step, 2600);
      } else if (chars <= 0) {
        direction = 1;
        timer = setTimeout(step, 700);
      } else {
        timer = setTimeout(step, direction === 1 ? 85 : 40);
      }
    };

    timer = setTimeout(step, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <p aria-label={TEXT} className="text-xs leading-5 text-muted">
      <span aria-hidden="true">
        {TEXT.slice(0, count)}
        <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 bg-accent animate-pulse" />
      </span>
      <span className="sr-only">{TEXT}</span>
    </p>
  );
}
