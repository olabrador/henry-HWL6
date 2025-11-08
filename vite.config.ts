import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom'],
          // Separate page chunks (already handled by lazy loading)
        },
        // Optimize chunk file names
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (optional, can disable for smaller builds)
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Report compressed size
    reportCompressedSize: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
