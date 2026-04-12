import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "leaflet/dist/leaflet.css"; // Ensure Leaflet CSS is loaded early
import { ThemeProvider } from "next-themes";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
);