import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React and routing
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI library chunks
          'ui-components': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-progress',
            '@radix-ui/react-popover',
            '@radix-ui/react-alert-dialog',
          ],
          
          // Data management
          'data-vendor': [
            '@tanstack/react-query',
            '@supabase/supabase-js',
          ],
          
          // Chart and visualization libraries
          'charts': [
            'recharts',
            'date-fns',
            'lucide-react',
          ],
          
          // Form and validation
          'forms': [
            'react-hook-form',
            'zod',
            '@hookform/resolvers',
          ],
          
          // Utility libraries
          'utils': [
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
          ],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
}));
