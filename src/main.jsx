import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PinGate from "./PinGate.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PinGate>
      <App />
    </PinGate>
  </StrictMode>
);
