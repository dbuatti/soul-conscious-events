import { defineConfig } from "vite";
    import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
    import react from "@vitejs/plugin-react-swc";
    import path from "path";

    export default defineConfig(() => ({
      server: {
        host: "::",
        port: 32100,
      },
      plugins: [dyadComponentTagger(), react()],
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
      define: {
        'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify("AIzaSyBOhxn3A2qu5e9VJHamFCRdwAZzV9r4424"),
      },
    }));