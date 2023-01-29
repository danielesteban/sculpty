import fs from 'fs';
import path from 'path';
import copy from 'rollup-plugin-copy';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import wasm from '@rollup/plugin-wasm';
import webWorkerLoader from 'rollup-plugin-web-worker-loader';

const outputPath = path.resolve(__dirname, 'dist');

export default {
  external: ['three'],
  input: path.join(__dirname, 'src'),
  output: {
    file: path.join(outputPath, 'sculpty.js'),
    format: 'esm',
  },
  plugins: [
    nodeResolve({ extensions: ['.js', '.ts'] }),
    typescript(),
    wasm({ maxFileSize: Infinity }),
    webWorkerLoader(),
    terser({ format: { comments: false } }),
    copy({
      copyOnce: true,
      targets: [
        { src: 'LICENSE', dest: 'dist' },
        { src: 'README.md', dest: 'dist' },
      ],
    }),
    {
      writeBundle() {
        fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify({
          name: 'sculpty',
          author: 'Daniel Esteban Nombela',
          license: 'MIT',
          version: '0.0.3',
          module: './sculpty.js',
          types: './types',
          homepage: 'https://sculpty.gatunes.com',
          repository: {
            type: 'git',
            url: 'https://github.com/danielesteban/sculpty',
          },
          peerDependencies: {
            three: '>=0.149.0',
          },
        }, null, '  '));
      },
    },
  ],
  watch: { clearScreen: false },
};
