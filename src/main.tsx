import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "leaflet/dist/leaflet.css"; // Ensure Leaflet CSS is loaded early
import ErrorBoundary from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);