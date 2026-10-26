import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages (/<repo>/) and later inside the desktop app.
export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: true },
});
