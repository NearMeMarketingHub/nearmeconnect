import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Replit plugin errors that cause annoying popups
window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message || "";
  if (msg.includes("Failed to fetch") || 
      msg.includes("postUserData") ||
      msg.includes("network") ||
      msg.includes("CORS") ||
      msg.includes("cartographer")) {
    event.preventDefault();
    console.warn("Suppressed error:", msg);
  }
});

// Also suppress global errors from Replit plugins
window.addEventListener("error", (event) => {
  const msg = event.message || "";
  if (msg.includes("cartographer") ||
      msg.includes("postUserData") ||
      msg.includes("ResizeObserver")) {
    event.preventDefault();
    console.warn("Suppressed error:", msg);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
