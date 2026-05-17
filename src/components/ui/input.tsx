import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, onFocus, onBlur, ...props }: React.ComponentProps<"input">) {
  const ref = React.useRef<HTMLInputElement | null>(null);

  const handleFocus: React.FocusEventHandler<HTMLInputElement> = (e) => {
    if (ref.current) {
      ref.current.style.borderColor = "#D5B888";
      ref.current.style.boxShadow = "0 0 0 3px rgba(213,184,136,0.5)";
    }
    if (onFocus) onFocus(e as any);
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
    if (ref.current) {
      ref.current.style.borderColor = "";
      ref.current.style.boxShadow = "";
    }
    if (onBlur) onBlur(e as any);
  };

  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
}

export { Input };
