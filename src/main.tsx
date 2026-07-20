import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Empty app cache (theme + active org) so app starts fresh
try {
  localStorage.removeItem("app_theme");
  localStorage.removeItem("active_org");
} catch {}

// Apply theme before first render (default: light)
document.documentElement.classList.add("light");

createRoot(document.getElementById("root")!).render(<App />);
