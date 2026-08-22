import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const masterPassword = env.VITE_TOOLS_PASSWORD || env.TOOLS_PASSWORD || env.PASSWORD || '';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_TOOLS_PASSWORD': JSON.stringify(masterPassword),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});


