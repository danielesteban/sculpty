import './main.css';
import { World } from 'sculpty';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Drawing from './core/drawing';
import Materials from './core/materials';
import PatchShaders from './core/patches';
import Storage from './core/storage';
import Viewport from './core/viewport';
import Walk from './core/walk';
import Color from './ui/color';
import Exporter from './ui/exporter';
import Orientation from './ui/orientation';
import Size from './ui/size';
import Snapshot from './ui/snapshot';

PatchShaders();

const viewport = new Viewport((delta) => {
  controls.update();
  for (let i = 0; i < 4; i++) {
    walk.update(delta / 4);
  }
});

const materials = Materials();
const storage = new Storage({ chunkSize: 32 });
const world = new World({ history: true, materials, storage });
world.addEventListener('change', () => {
  viewport.needsUpdate = true;
});
viewport.scene.add(world);

const ui = document.getElementById('ui');
if (!ui) {
  throw new Error('Couldn\'t get ui');
}
const color = new Color();
const size = new Size();
const orientation = new Orientation();
new Exporter(world);
new Snapshot(viewport);
ui.style.display = '';

const controls = new OrbitControls(viewport.camera, viewport.dom);
controls.addEventListener('change', () => {
  viewport.needsUpdate = true;
});
controls.enableDamping = true;
controls.enablePan = controls.enableRotate = false;
controls.dampingFactor = 0.1;
controls.maxDistance = 96;
controls.minDistance = 4;
controls.mouseButtons.MIDDLE = undefined;
controls.target.set(0, 8, 0);
viewport.camera.position.set(0, 16, 32);
const walk = new Walk(viewport.camera, controls, world);

const drawing = new Drawing(viewport.camera, color, orientation, size, world);
viewport.addEventListener('dragstart', ({ pointer, ctrlKey, shiftKey }: any) => {
  if (!controls.enablePan && !walk.isEnabled()) {
    drawing.start(pointer, ctrlKey, shiftKey);
  }
});
viewport.addEventListener('dragmove', ({ pointer }: any) => (
  drawing.move(pointer)
));
viewport.addEventListener('dragend', () => (
  drawing.end()
));
document.addEventListener('keydown', (e) => {
  const { ctrlKey, code, repeat, shiftKey } = e;
  if (!repeat && code === 'Escape') {
    ui.style.display = walk.toggle() ? 'none' : '';
  }
  if (!repeat && code === 'Tab') {
    e.preventDefault();
    materials.triangles.visible = !materials.triangles.visible;
    materials.voxels.visible = !materials.triangles.visible;
    viewport.needsUpdate = true;
  }
  if (!repeat && ctrlKey && code === 'Backspace') {
    e.preventDefault();
    localStorage.clear();
    location.reload();
  }
  if (walk.isEnabled()) {
    return;
  }
  if (!repeat && code === 'Space') {
    controls.enablePan = controls.enableRotate = true;
  }
  if (!repeat && ['Digit1', 'Digit2', 'Digit3'].includes(code)) {
    size.setValue(['Digit1', 'Digit2', 'Digit3'].indexOf(code));
  }
  if (!repeat && code === 'KeyE') {
    orientation.toggleMode();
  }
  if (ctrlKey && code === 'KeyZ') {
    e.preventDefault();
    if (shiftKey) {
      world.redo();
    } else {
      world.undo();
    }
  }
});
document.addEventListener('keyup', ({ code }) => {
  if (walk.isEnabled()) {
    return;
  }
  if (code === 'Space') {
    controls.enablePan = controls.enableRotate = false;
  }
});

{
  const chunks: { x: number; y: number; z: number; d: number; }[] = [];
  const maxY = Math.min(
    1 + storage.listStored().reduce((max, { y }) => Math.max(max, y), 0),
    3
  );
  for (let z = -3; z <= 3; z++) {
    for (let y = 0; y <= maxY; y++) {
      for (let x = -3; x <= 3; x++) {
        chunks.push({ x, y, z, d: Math.sqrt(x * x + y * y + z * z)});
      }
    }
  }
  chunks.sort(({ d: a }, { d: b }) => a - b);
  chunks.forEach(({ x, y, z }) => (
    world.updateChunk(x, y, z)
  ));
}
