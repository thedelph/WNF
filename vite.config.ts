import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
<<<<<<< Updated upstream
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    
    // Define environment variables
    define: {
      'process.env': env
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
      minify: 'terser',
      target: 'esnext',
      chunkSizeWarningLimit: 1000,
      
      // Optimize chunks
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['framer-motion', 'react-hot-toast', 'lucide-react'],
            supabase: ['@supabase/supabase-js', '@supabase/auth-helpers-react']
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },

    // Optimize dev server
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        overlay: true
      }
    },

    // Optimize preview
    preview: {
      port: 4173,
      strictPort: true
=======
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-transform-class-properties', { loose: true }]
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    watch: {
      usePolling: true
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
>>>>>>> Stashed changes
    }
  }
})