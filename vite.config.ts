import { defineConfig } from "vite";
    import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
    import react from "@vitejs/plugin-react-swc";
    import path from "path";

    export default defineConfig(() => ({
      server: {
        host: "::",
        port: 8080, // This is where the port 8080 is configured
      },
      plugins: [dyadComponentTagger(), react()],
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
      define: {
        'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify("AIzaSyBIAYKFIlCYLkU2qb9k1svA7rLKvAve71I"),
      },
    }));