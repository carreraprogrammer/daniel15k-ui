import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

const landingPagePlugin: Plugin = {
  name: 'landing-page',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/') req.url = '/landing.html';
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), landingPagePlugin],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' },
});
