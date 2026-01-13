import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0', // Listen on all network interfaces - allows mobile devices to connect
    port: 5173,
    strictPort: false,
    // Allow access from network devices
    hmr: {
      clientPort: 5173,
    },
  },
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
