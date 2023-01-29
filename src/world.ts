import { Group, Material, MeshBasicMaterial, Vector3 } from 'three';
import { Geometry, Materials } from './chunks/types';
import Chunk from './chunks/chunk';
import { Storage, MemoryStorage } from './storage';
import Worker from './workers/worker';
// @ts-ignore
import MesherProgram from './workers/mesher.wasm';
// @ts-ignore
import MesherWorker from 'web-worker:./workers/mesher.js';

const _queueMicrotask = (typeof self.queueMicrotask === 'function') ? (
  self.queueMicrotask
) : (callback: () => void) => {
  Promise.resolve()
    .then(callback)
    .catch(e => setTimeout(() => { throw e; }));
};

type Action = { x: number; y: number; z: number; undo: number; redo: number; };

class World extends Group {
  private readonly chunks: Map<string, Chunk>;
  private readonly queue: Map<string, { x: number; y: number; z: number }>;
  private readonly materials: Materials;
  private readonly mesher: Worker<Geometry>;
  private readonly history: {
    enabled: boolean;
    last: number;
    undo: Action[][];
    redo: Action[][];
  };
  private readonly storage: Storage;

  constructor({
    history = false,
    materials = {},
    storage = new MemoryStorage(),
  }: {
    history?: boolean;
    materials?: { triangles?: Material; voxels?: Material; };
    storage?: Storage;
  } = {}) {
    super();
    this.chunks = new Map();
    this.queue = new Map();
    this.materials = {
      triangles: materials.triangles || new MeshBasicMaterial({ vertexColors: true }),
      voxels: materials.voxels || new MeshBasicMaterial({ visible: false }),
    };
    const { chunkSize } = storage;
    this.mesher = new Worker({
      buffer: chunkSize * chunkSize * chunkSize * 8,
      options: { chunkSize },
      program: MesherProgram,
      script: MesherWorker,
    });
    this.history = { enabled: history, last: -1, undo: [], redo: [] };
    this.storage = storage;
  }

  dispose() {
    const { chunks, mesher, queue } = this;
    chunks.forEach((chunk) => chunk.dispose());
    mesher.dispose();
    queue.clear();
  }

  undo() {
    const { history } = this;
    const actions = history.undo.pop();
    if (!actions) {
      return;
    }
    history.last = -1;
    history.redo.push(actions);
    this.update(
      actions.map(({ x, y, z, undo }) => ({
        x, y, z,
        r: (undo >> 8) & 0xFF, g: (undo >> 16) & 0xFF, b: (undo >> 24) & 0xFF,
        value: undo & 0xFF,
      })),
      -1,
      true
    );
  }

  redo() {
    const { history } = this;
    const actions = history.redo.pop();
    if (!actions) {
      return;
    }
    history.last = -1;
    history.undo.push(actions);
    this.update(
      actions.map(({ x, y, z, redo }) => ({
        x, y, z,
        r: (redo >> 8) & 0xFF, g: (redo >> 16) & 0xFF, b: (redo >> 24) & 0xFF,
        value: redo & 0xFF,
      })),
      -1,
      true
    );
  }

  updateChunk(x: number, y: number, z: number) {
    const { materials, mesher, storage } = this;
    const { chunkSize } = storage;
    const key: string = `${x}:${y}:${z}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk({
        materials,
        position: new Vector3(
          x * chunkSize + chunkSize * -0.5,
          y * chunkSize + chunkSize * -0.5,
          z * chunkSize + chunkSize * -0.5
        ),
      });
      this.add(chunk);
      this.chunks.set(key, chunk);
    }
    const chunks = [];
    for (let cz = z - 1; cz <= z; cz++) {
      for (let cy = y - 1; cy <= y; cy++) {
        for (let cx = x - 1; cx <= x; cx++) {
          chunks.push(storage.get(cx, cy, cz));
        }
      }
    }
    const version = ++chunk.request;
    mesher.run(chunks).then((geometry) => {
      if (chunk && chunk.version < version) {
        chunk.update(geometry);
        chunk.version = version;
        this.dispatchEvent({ type: 'change' });
      }
    });
  }

  update(
    updates: {
      x: number, y: number, z: number,
      r?: number, g?: number, b?: number,
      value?: number,
    }[],
    id: number = -1,
    isFromHistory: boolean = false
  ) {
    const { history, queue, storage } = this;
    const { chunkSize } = storage;
    const halfChunkSize = chunkSize * 0.5;
    const hasQueuedUpdate = !!queue.size;

    const affected = new Map();
    const actions = updates.reduce((actions: Action[], { x, y, z, value, r = 0, g = 0, b = 0 }) => {
      const cx = Math.floor(x / chunkSize);
      const cy = Math.floor(y / chunkSize);
      const cz = Math.floor(z / chunkSize);
      const vx = x - cx * chunkSize;
      const vy = y - cy * chunkSize;
      const vz = z - cz * chunkSize;
      const vi = vz * chunkSize * chunkSize + vy * chunkSize + vx;
      const data = storage.get(cx, cy, cz);
      const current = data[vi];
      if (value === undefined) {
        value = current & 0xFF;
        if (value === 0) {
          return actions;
        }
      }
      const updated = (
        (b << 24)
        ^ (g << 16)
        ^ (r << 8)
        ^ value
      );
      data[vi] = updated;

      for (let nz = 0; nz < 2; nz++) {
        for (let ny = 0; ny < 2; ny++) {
          for (let nx = 0; nx < 2; nx++) {
            if (
              vx >= ((nx * halfChunkSize) - 1) && vx <= (nx + 1) * halfChunkSize
              && vy >= ((ny * halfChunkSize) - 1) && vy <= (ny + 1) * halfChunkSize
              && vz >= ((nz * halfChunkSize) - 1) && vz <= (nz + 1) * halfChunkSize
            ) {
              const ncx = cx + nx;
              const ncy = cy + ny;
              const ncz = cz + nz;
              const nkey = `${ncx}:${ncy}:${ncz}`;
              if (!queue.has(nkey)) {
                queue.set(nkey, { x: ncx, y: ncy, z: ncz });
              }
            }
          }
        }
      }
  
      const key = `${cx}:${cy}:${cz}`;
      if (!affected.has(key)) {
        affected.set(key, { x: cx, y: cy, z: cz });
      }
  
      if (history.enabled && !isFromHistory) {
        actions.push({ x, y, z, undo: current, redo: updated });
      }
      return actions;
    }, []);

    if (history.enabled && !isFromHistory) {
      const last = history.undo[history.undo.length - 1];
      if (id !== -1 && history.last === id && last.length < 10000) {
        actions.forEach((action) => {
          const existing = last.find(({ x, y, z }) => (
            x === action.x
            && y === action.y
            && z === action.z
          ));
          if (existing) {
            existing.redo = action.redo;
          } else {
            last.push(action);
          }
        });
      } else {
        history.undo.push(actions);
      }
      history.last = id;
      history.redo.length = 0;
    }

    affected.forEach(({ x, y, z }) => storage.save(x, y, z));

    if (!hasQueuedUpdate && queue.size) {
      _queueMicrotask(() => {
        queue.forEach(({ x, y, z }) => this.updateChunk(x, y, z));
        queue.clear();
      });
    }
  }
}

export default World;
