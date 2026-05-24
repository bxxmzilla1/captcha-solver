import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

registerSW({
  onNeedRefresh() {
    if (confirm("A new version is available. Reload to update?")) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.info("CipherSolve is ready to work offline.");
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
