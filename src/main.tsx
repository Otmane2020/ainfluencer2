import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// App is dark-only across all pages
try {
  localStorage.setItem("app_theme", "dark");
  localStorage.removeItem("active_org");
} catch {}

// Ensure dark theme applied before first render
document.documentElement.classList.remove("light");

createRoot(document.getElementById("root")!).render(<App />);
