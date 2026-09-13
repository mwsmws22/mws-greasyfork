import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  build: {
    minify: false,
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Bunpro Review Tweaks',
        namespace: 'mwsmws22',
        author: 'mwsmws22',
        license: 'MIT',
        description:
          'Quality-of-life tweaks for Bunpro reviews. Shows an example sentence for vocab that Bunpro reviews without one.',
        // Bunpro routes client-side, so /reviews is often reached without a page
        // load. Every feature activates off the elements it needs being present.
        match: ['https://bunpro.jp/*'],
        'run-at': 'document-idle',
      },
      build: {
        fileName: 'bunpro-review-tweaks.user.js',
        metaFileName: true,
      },
    }),
  ],
});
