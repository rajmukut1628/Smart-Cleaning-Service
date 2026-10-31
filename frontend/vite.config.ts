import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Local UI can use the deployed API without opening a direct Atlas connection.
  const target = mode === 'live' ? 'https://smart-cleaning-service.onrender.com' : 'http://localhost:5003';
  return {
  plugins: [react(),tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) return 'charts';
          if (id.includes('node_modules/react-big-calendar') || id.includes('node_modules/date-fns') || id.includes('node_modules/lodash')) return 'calendar';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/socket.io': { target, changeOrigin: true, ws: true },
      '/uploads': { target, changeOrigin: true },
      '/api': {
        target,
        changeOrigin: true,
      },
    },
  },
  };
});
