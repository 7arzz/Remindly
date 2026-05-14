import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { registerSW } from "virtual:pwa-register";

import { Toaster } from "sonner";

registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Toaster richColors position="top-center" theme="dark" closeButton />
    <App />
  </StrictMode>,
);
