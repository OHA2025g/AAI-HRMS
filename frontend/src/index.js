import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

/** Remove Emergent “Made with Emergent” badge if still present (cached index.html or late-injected script). */
function stripEmergentPlatformBadge() {
  document.getElementById("emergent-badge")?.remove();
  document.querySelectorAll('a[href*="emergent.sh"], a[href*="emergentagent.com"]').forEach((el) => {
    const t = (el.textContent || "").toLowerCase();
    if (t.includes("emergent") || t.includes("made with")) el.remove();
  });
}
stripEmergentPlatformBadge();
if (typeof MutationObserver !== "undefined" && document.body) {
  const obs = new MutationObserver(stripEmergentPlatformBadge);
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("load", () => {
    stripEmergentPlatformBadge();
    setTimeout(() => obs.disconnect(), 60000);
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
