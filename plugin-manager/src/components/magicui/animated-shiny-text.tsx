import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number;
}

/** Texto com um brilho que atravessa as letras periodicamente. */
export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
  ...props
}: AnimatedShinyTextProps) {
  return (
    <span
      style={{ "--shiny-width": `${shimmerWidth}px` } as CSSProperties}
      className={cn(
        "text-zinc-600/70 dark:text-zinc-400/70",
        "animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shiny-width)_100%] [transition:background-position_1s_cubic-bezier(0.6,0.6,0,1)_infinite]",
        "bg-linear-to-r from-transparent via-zinc-900/80 via-50% to-transparent dark:via-white/80",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
