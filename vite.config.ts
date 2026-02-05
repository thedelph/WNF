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
      port: 5175, // IMPORTANT: Must be 5175 for Supabase CORS configuration
      strictPort: true, // Fail if port is already in use instead of trying another
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
            ui: ['framer-motion', 'react-hot-toast', 'lucide-react', 'recharts'],
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

    // Add base URL configuration
    base: '/',

    // Ensure proper handling of assets
    publicDir: 'public',
    assetsInclude: ['**/*.{png,jpg,gif,svg,webp,mp4,webm,ogg,mp3,wav,pdf,doc,docx}']
  }
})