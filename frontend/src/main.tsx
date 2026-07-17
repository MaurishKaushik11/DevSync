import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { initEnv } from "./config/env";
import App from "./App.tsx";

initEnv(import.meta.env);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
