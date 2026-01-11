import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import path from 'path';

const isProd = process.env.RUN_PROD === '1';

export default defineConfig({
	server: {
		watch: {
    usePolling: true,
    interval: 10000,
  },
    hmr: false,     // disables hot module reload
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@app': fileURLToPath(new URL('./src/App.js', import.meta.url)),
    },
  },
});

