import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

/**
 * Light ⇄ dark toggle for the console.
 * Shares the `laplace-theme` localStorage key and the `data-theme` <html>
 * attribute with the pre-paint snippet in index.html, so there is no flash and
 * the choice persists across all Laplace subdomains.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === "undefined" ? "light" : current(),
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("laplace-theme", theme);
    } catch {
      /* private mode / storage disabled — in-memory only */
    }
  }, [theme]);

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      title="Toggle light / dark"
      onClick={() => {
        document.documentElement.classList.add("theme-anim");
        setTheme((t) => (t === "dark" ? "light" : "dark"));
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-2 hover:text-fg"
    >
      {theme === "dark" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}
