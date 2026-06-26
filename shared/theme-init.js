/*
 * Laplace theme bootstrap — SINGLE SOURCE OF TRUTH for the pre-paint snippet.
 *
 * This MUST run render-blocking in <head> BEFORE any styled markup, otherwise a
 * light flash precedes a dark page (FOUC). It is intentionally tiny and inlined
 * verbatim into every surface's HTML head:
 *   - astro main : src/layouts/Base.astro      (<script is:inline>)
 *   - docs       : Starlight head config        (tag: 'script')
 *   - console    : index.html <head>            (<script>)
 *
 * Contract: localStorage key `laplace-theme` ∈ {"light","dark"}; absent → OS.
 * Keep this file and the inlined copies byte-identical.
 */
(function () {
  try {
    var stored = localStorage.getItem("laplace-theme");
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
