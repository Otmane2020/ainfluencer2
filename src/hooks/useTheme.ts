import { useEffect } from "react";

export type Theme = "dark" | "light";

// App is dark-only across all pages. Theme is forced to "dark".
export function useTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    try {
      localStorage.setItem("app_theme", "dark");
    } catch {}
  }, []);

  const setTheme = (_t: Theme) => {
    document.documentElement.classList.remove("light");
  };
  const toggleTheme = () => {
    document.documentElement.classList.remove("light");
  };

  return { theme: "dark" as Theme, setTheme, toggleTheme };
}
