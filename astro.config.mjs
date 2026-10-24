import { defineConfig } from 'astro/config';

// Static output, no integrations. Hosting target: a NEW Netlify site (never the legacy one).
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
});
