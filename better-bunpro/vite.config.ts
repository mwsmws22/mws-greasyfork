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
        name: 'Better Bunpro',
        namespace: 'mwsmws22',
        author: 'mwsmws22',
        license: 'MIT',
        description:
          'Features I wish Bunpro had. Show example sentences for A1+ vocab after a correct answer, cycle sentences with Tab, keep guessing after a wrong answer, and more.',
        // Bunpro routes client-side, so /reviews is often reached without a page
        // load. Every feature activates off the elements it needs being present.
        match: ['https://bunpro.jp/*'],
        'run-at': 'document-idle',
      },
      build: {
        fileName: 'better-bunpro.user.js',
        metaFileName: true,
      },
    }),
  ],
});
