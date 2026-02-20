import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme before first render to avoid flash
const savedTheme = localStorage.getItem("app_theme");
if (savedTheme === "light") {
  document.documentElement.classList.add("light");
}

createRoot(document.getElementById("root")!).render(<App />);
