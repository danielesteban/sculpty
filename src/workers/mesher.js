import instantiate from './program.js';

let program;

const onLoad = ({ data: { options: { chunkSize }, program: module } }) => {
  instantiate({
    memory: [
      { id: 'chunks', type: Uint32Array, size: chunkSize * chunkSize * chunkSize * 8 },
      { id: 'counts', type: Int32Array, size: 2 },
      { id: 'vertices', type: Float32Array, size: chunkSize * chunkSize * chunkSize * 3 * 9 * 5 },
      { id: 'voxels', type: Float32Array, size: chunkSize * chunkSize * chunkSize * 0.5 * 6 },
      { id: 'bounds', type: Float32Array, size: 6 },
    ],
    program: module,
  })
    .then(({ memory, run }) => {
      program = {
        chunkSize,
        memory,
        run,
      };
      self.removeEventListener('message', onLoad);
      self.addEventListener('message', onData);
      self.postMessage(true);
    });
};
self.addEventListener('message', onLoad);

const onData = ({ data: chunks }) => {
  program.memory.chunks.view.set(chunks);
  program.run(
    program.memory.chunks.address,
    program.memory.counts.address,
    program.memory.vertices.address,
    program.memory.voxels.address,
    program.memory.bounds.address,
    program.chunkSize
  );
  const [triangles, instances] = program.memory.counts.view;
  if (triangles === 0) {
    self.postMessage({ buffer: chunks, data: false }, [chunks.buffer]);
    return;    
  }
  const bounds = program.memory.bounds.view.slice(0);
  const vertices = program.memory.vertices.view.slice(0, triangles * 3 * 9);
  const voxels = program.memory.voxels.view.slice(0, instances * 6);
  self.postMessage({ buffer: chunks, data: { bounds, vertices, voxels } }, [chunks.buffer, bounds.buffer, vertices.buffer, voxels.buffer]);
};
