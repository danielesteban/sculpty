[sculpty](https://github.com/danielesteban/sculpty)
[![npm-version](https://img.shields.io/npm/v/sculpty.svg)](https://www.npmjs.com/package/sculpty)
==

### Installation

```bash
npm install sculpty
```

### Basic usage

```js
import { World } from 'sculpty';
import { PerspectiveCamera, Scene, sRGBEncoding, WebGLRenderer } from 'three';

const aspect = window.innerWidth / window.innerHeight;
const camera = new PerspectiveCamera(75, aspect, 0.1, 1000);
const renderer = new WebGLRenderer({ antialias: true });
renderer.outputEncoding = sRGBEncoding;
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('renderer').appendChild(renderer.domElement);

const scene = new Scene();
const world = new World();
world.update(Array.from({ length: 20 }, (_, i) => ({
  x: i - 10, y: Math.floor(Math.sin(i * 0.5) * 2), z: -10,
  r: 255, g: 255, b: 255,
  value: 255,
})));
scene.add(world);

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
```
