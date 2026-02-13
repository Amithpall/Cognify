import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const llamaUrl = (env.LLAMA_API_URL || 'http://localhost:11434/api/chat').replace(/\/+$/, '');
  const apiPort = env.API_PORT || '3001';

  // Parse the URL to split origin and path
  const parsedUrl = new URL(llamaUrl);
  const origin = parsedUrl.origin; // e.g. http://172.168.1.250:8000
  const urlPath = parsedUrl.pathname; // e.g. /chat

  // Ollama direct endpoint for streaming (same host, port 11434)
  const ollamaOrigin = `${parsedUrl.protocol}//${parsedUrl.hostname}:11434`;

  return {
    server: {
      port: 3000,
      strictPort: false,
      host: '0.0.0.0',
      proxy: {
        // Proxy /llm-api → FastAPI server (non-streaming, for JSON responses)
        '/llm-api': {
          target: origin,
          changeOrigin: true,
          rewrite: () => urlPath,
        },
        // Proxy /ollama-stream → Ollama directly (streaming, token-by-token)
        '/ollama-stream': {
          target: ollamaOrigin,
          changeOrigin: true,
          rewrite: () => '/api/generate',
        },
        // Proxy /api → Express backend
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.LLAMA_API_URL': JSON.stringify(llamaUrl),
      'process.env.LLAMA_MODEL': JSON.stringify(env.LLAMA_MODEL || 'kimi-k2.5:cloud'),
      'process.env.LLAMA_API_KEY': JSON.stringify(env.LLAMA_API_KEY || ''),
      'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
