import fs from 'fs';
import path from 'path';
import alias from '@rollup/plugin-alias';
import copy from 'rollup-plugin-copy';
import html from '@rollup/plugin-html';
import livereload from 'rollup-plugin-livereload';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import serve from 'rollup-plugin-serve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const outputPath = path.resolve(__dirname, 'dist');
const production = !process.env.ROLLUP_WATCH;

export default {
  input: path.join(__dirname, 'main.ts'),
  output: {
    dir: outputPath,
    format: 'iife',
    sourcemap: !production,
  },
  plugins: [
    alias({
      entries: { 'sculpty': path.join(__dirname, '..', 'dist') },
    }),
    nodeResolve({ extensions: ['.js', '.ts'] }),
    typescript({ sourceMap: !production }),
    postcss({
      extract: 'main.css',
      minimize: production,
    }),
    html({
      template: ({ files }) => (
        fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
          .replace(
            '<link rel="stylesheet">',
            (files.css || [])
              .map(({ fileName }) => `<link rel="stylesheet" href="/${fileName}">`)
          )
          .replace(
            '<script></script>',
            (files.js || [])
              .map(({ fileName }) => `<script defer src="/${fileName}"></script>`)
          )
          .replace(/(  |\n)/g, '')
      ),
    }),
    copy({
      copyOnce: true,
      targets: [
        { src: 'favicon.ico', dest: 'dist' },
      ],
    }),
    ...(production ? [
      terser({ format: { comments: false } }),
      {
        writeBundle() {
          fs.writeFileSync(path.join(outputPath, 'CNAME'), 'sculpty.gatunes.com');
        },
      },
    ] : [
      serve({
        contentBase: outputPath,
        port: 8080,
        host: '0.0.0.0',
      }),
      livereload(outputPath),
    ]),
  ],
  watch: { clearScreen: false },
};
