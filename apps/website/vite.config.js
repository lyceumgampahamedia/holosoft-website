import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const pagesBase = process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/';

export default defineConfig({
  envDir: '../../',
  base: pagesBase,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
      '/uploads': 'http://localhost:8787'
    }
  }
});
