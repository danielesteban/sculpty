import './main.css';
import { World } from 'sculpty';
import {
  Clock,
  Mesh,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import Input from './core/input';
import Materials from './core/materials';
import PatchShaders from './core/patches';
import PostProcessing from './core/postprocessing';
import Storage from './core/storage';
import Walk from './core/walk';
import Color from './ui/color';
import Exporter from './ui/exporter';
import Orientation, { OrientationMode } from './ui/orientation';
import Size from './ui/size';
import Snapshot from './ui/snapshot';

PatchShaders();

const ui = document.getElementById('ui');
if (!ui) {
  throw new Error("Couldn't get ui");
}
const viewport = document.getElementById('viewport');
if (!viewport) {
  throw new Error("Couldn't get viewport");
}
viewport.addEventListener('contextmenu', (e) => e.preventDefault());
viewport.addEventListener('touchstart', (e) => e.preventDefault());

const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
const renderer = new WebGLRenderer({
  antialias: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(window.devicePixelRatio || 1);
const scene = new Scene();
scene.environment = (new PMREMGenerator(renderer)).fromScene(new RoomEnvironment(), 0.04).texture;
const postprocessing = new PostProcessing({ samples: 4 });

let needsUpdate = false;

const resize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  postprocessing.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  needsUpdate = true;
};

resize();
window.addEventListener('resize', resize);
viewport.appendChild(renderer.domElement);

const materials = Materials();
const storage = new Storage({ chunkSize: 32 });
const world = new World({ history: true, materials, storage });
world.addEventListener('change', () => {
  needsUpdate = true;
});
scene.add(world);

const chunks: { x: number; y: number; z: number; d: number; }[] = [];
{
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
}
chunks.sort(({ d: a }, { d: b }) => a - b);
chunks.forEach(({ x, y, z }) => (
  world.updateChunk(x, y, z)
));

const controls = new OrbitControls(camera, viewport);
controls.addEventListener('change', () => {
  needsUpdate = true;
});
controls.enableDamping = true;
controls.enablePan = controls.enableRotate = false;
controls.dampingFactor = 0.1;
controls.maxDistance = 96;
controls.minDistance = 4;
controls.mouseButtons.MIDDLE = undefined;
document.addEventListener('keyup', ({ key }) => {
  if (walk.isEnabled()) {
    return;
  }
  if (key === ' ') {
    controls.enablePan = controls.enableRotate = false;
  }
});

controls.target.set(0, 8, 0);
camera.position.set(0, 16, 32);
const walk = new Walk(camera, controls, world);

const color = new Color();
const size = new Size();
const orientation = new Orientation();

materials.voxels.visible = false;
document.addEventListener('keydown', (e) => {
  const { ctrlKey, key, repeat, shiftKey } = e;
  if (!repeat && key.toLocaleLowerCase() === 'escape') {
    ui.style.display = walk.toggle() ? 'none' : '';
  }
  if (key.toLocaleLowerCase() === 'backspace' && ctrlKey) {
    e.preventDefault();
    localStorage.clear();
    location.reload();
  }
  if (!repeat && key.toLocaleLowerCase() === 'tab') {
    e.preventDefault();
    materials.triangles.visible = !materials.triangles.visible;
    materials.voxels.visible = !materials.triangles.visible;
    needsUpdate = true;
  }
  if (walk.isEnabled()) {
    return;
  }
  if (!repeat && key === ' ') {
    controls.enablePan = controls.enableRotate = true;
  }
  if (ctrlKey && key.toLocaleLowerCase() === 'z') {
    e.preventDefault();
    if (shiftKey) {
      world.redo();
    } else {
      world.undo();
    }
  }
  if (!repeat && ['1', '2', '3'].includes(key)) {
    size.setValue(parseInt(key, 10) - 1);
  }
  if (!repeat && key.toLocaleLowerCase() === 'e') {
    orientation.toggleMode();
  }
});

const aux = new Vector3();
const center = new Vector3(0.5, 0.5, 0.5);
const drawing = {
  action: 0,
  isEnabled: false,
  isEraser: false,
  isPaint: false,
  lastPosition: new Vector3(),
  plane: new Mesh(new PlaneGeometry(10000, 10000, 1, 1)),
  raycaster: new Raycaster(undefined, undefined, 0, 128),
};
const input = new Input(viewport);
input.addEventListener('dragstart', ({ pointer, ctrlKey, shiftKey }) => {
  if (
    controls.enablePan
    || (ctrlKey && pointer.button !== 1)
    || (shiftKey && pointer.button !== 1)
    || walk.isEnabled()
  ) {
    return;
  }

  const { plane, raycaster } = drawing;
  raycaster.setFromCamera(pointer.position, camera);
  const hit = raycaster.intersectObject(world, true)[0];
  if (!hit || !hit.face?.normal) {
    return;
  }
  if (pointer.button === 4) {
    const hex = (hit.object as any).getColor(hit.instanceId).getHex();
    color.setValue(
      (hex >> 16) & 0xFF,
      (hex >> 8) & 0xFF,
      hex & 0xFF
    );
    return;
  }
 
  drawing.action++;
  drawing.isEnabled = true;
  drawing.isEraser = ctrlKey || pointer.button === 2;
  drawing.isPaint = shiftKey;
  hit.point
    .addScaledVector(hit.face.normal, 0.25 * ((drawing.isEraser || drawing.isPaint) ? -1 : 1))
    .floor();
  draw(hit.point);

  plane.position.copy(hit.point).add(center);
  switch (orientation.mode) {
    default:
      plane.quaternion.copy(camera.quaternion);
      break;
    case OrientationMode.surface:
      plane.lookAt(aux.addVectors(plane.position, hit.face.normal));
      break;
  }
  plane.updateMatrixWorld();
});
input.addEventListener('dragmove', ({ pointer }) => {
  const { isEnabled, isPaint, lastPosition, plane, raycaster } = drawing;
  if (!isEnabled) {
    return;
  }
  raycaster.setFromCamera(pointer.position, camera);
  let hit;
  if (isPaint) {
    hit = raycaster.intersectObject(world, true)[0];
  } else {
    hit = raycaster.intersectObject(plane)[0];
  }
  if (!hit || !hit.face?.normal) {
    return;
  }
  if (isPaint) {
    hit.point
      .addScaledVector(hit.face.normal, 0.25 * ((drawing.isEraser || drawing.isPaint) ? -1 : 1));
  }
  hit.point.floor();
  if (
    lastPosition.equals(hit.point)
    || (
      isPaint && lastPosition.distanceTo(hit.point) > 8
    )
  ) {
    return;
  }
  draw(hit.point);
});
input.addEventListener('dragend', () => {
  drawing.isEnabled = false;
});

const draw = (position: Vector3) => {
  let value;
  let r, g, b;
  if (drawing.isEraser) {
    value = 0;
  } else {
    if (!drawing.isPaint) {
      value = 64 + Math.floor(Math.random() * 192);
    }
    r = color.value.r;
    g = color.value.g;
    b = color.value.b;
  }
  const s = size.value;
  const { x, y, z } = position;
  const updates = [];
  for (let bz = -s; bz <= s; bz++) {
    for (let by = -s; by <= s; by++) {
      for (let bx = -s; bx <= s; bx++) {
        updates.push({
          x: x + bx, y: y + by, z: z + bz,
          r, g, b,
          value,
        });
      }
    }
  }
  world.update(updates, drawing.action);
  drawing.lastPosition.copy(position);
};

const clock = new Clock();
document.addEventListener('visibilitychange', () => (
  document.visibilityState === 'visible' && clock.start()
));

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1);
  controls.update();
  for (let i = 0; i < 4; i++) {
    walk.update(delta / 4);
  }
  if (needsUpdate) {
    needsUpdate = false;
    postprocessing.render(renderer, camera, scene);
  }
});

new Exporter(world);
new Snapshot(postprocessing, renderer, camera, scene);

if (ui) ui.style.display = '';
