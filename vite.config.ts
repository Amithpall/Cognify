import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.LLAMA_API_URL': JSON.stringify(env.LLAMA_API_URL || 'http://localhost:11434'),
      'process.env.LLAMA_MODEL': JSON.stringify(env.LLAMA_MODEL || 'llama3.2'),
      'process.env.LLAMA_API_KEY': JSON.stringify(env.LLAMA_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
