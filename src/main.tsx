import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global guard: mouse-wheel scrolling must never change the value of a focused
// number input (percentages, amounts, counts). Values change by typing only.
document.addEventListener(
  "wheel",
  (event) => {
    const el = document.activeElement as HTMLInputElement | null;
    if (el && el.tagName === "INPUT" && el.type === "number" && el.contains(event.target as Node)) {
      el.blur();
    }
  },
  { passive: true },
);

createRoot(document.getElementById("root")!).render(<App />);
