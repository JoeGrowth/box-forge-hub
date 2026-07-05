import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

// Intentionally no opacity animation — starting from opacity: 0 on every
// route change caused a visible blank flash before the content painted.
// Rendering directly is smoother than any short fade.
export function PageTransition({ children }: PageTransitionProps) {
  return <>{children}</>;
}
