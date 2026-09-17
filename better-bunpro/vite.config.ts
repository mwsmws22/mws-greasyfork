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
          'Features I wish Bunpro had. Show example sentences for A1+ vocab after a correct answer, cycle sentences with Tab, keep guessing after a wrong answer, add a missed translation as a synonym, edit a wrong answer with Left Arrow, play real speakers instead of synthesised term audio, and more.',
        // Bunpro routes client-side, so /reviews is often reached without a page
        // load. Every feature activates off the elements it needs being present.
        match: ['https://bunpro.jp/*'],
        connect: [
          'assets.languagepod101.com',
          'www.japanesepod101.com',
          'cdn.innovativelanguage.com',
          'jisho.org',
          'd1vjc5dkcd3yh2.cloudfront.net',
        ],
        'run-at': 'document-idle',
      },
      build: {
        fileName: 'better-bunpro.user.js',
        metaFileName: true,
      },
    }),
  ],
});
