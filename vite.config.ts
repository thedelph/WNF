import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    
    // Define environment variables
    define: {
      'process.env': env
    },

    // Server configuration
    server: {
      port: 5173, // Force Vite to use port 5173
      strictPort: true, // Don't try other ports if 5173 is taken
      hmr: {
        overlay: true
      }
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

    // Optimize preview
    preview: {
      port: 4173,
      strictPort: true
    }
  }
})