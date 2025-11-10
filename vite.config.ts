import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            entryFileNames: 'agent_csv_[name]-[hash].js',
            chunkFileNames: 'agent_csv_[name]-[hash].js',
          },
        },
      },
      worker: {
        format: 'es',
        rollupOptions: {
          output: {
            entryFileNames: 'agent_csv_[name]-[hash].js',
            chunkFileNames: 'agent_csv_[name]-[hash].js',
          },
        },
      },
    };
});
