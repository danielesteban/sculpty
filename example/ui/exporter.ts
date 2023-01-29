import { Group } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Download } from './icons';

class Exporter {
  constructor(world: Group) {
    const container = document.getElementById('actions');
    if (!container) {
      throw new Error('Couldn\'t get UI container');
    }
    const exporter = new GLTFExporter();
    const downloader = document.createElement('a');
    downloader.download = 'sculpty.glb';
    downloader.style.display = 'none';
    const action = document.createElement('div');
    action.className = 'action';
    const button = document.createElement('button');
    button.appendChild(Download());
    button.addEventListener('click', () => (
      exporter.parse(
        world.children.filter(({ visible }) => visible).map((chunk) => {
          const mesh: any = chunk.children[0].clone();
          mesh.position.copy(chunk.position);
          mesh.updateMatrix();
          return mesh;
        }),
        (buffer) => {
          const blob = new Blob([buffer as ArrayBuffer]);
          if (downloader.href) {
            URL.revokeObjectURL(downloader.href);
          }
          downloader.href = URL.createObjectURL(blob);
          downloader.click();
        },
        () => {},
        { binary: true }
      )
    ));
    action.appendChild(button);
    action.appendChild(downloader);
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.appendChild(document.createTextNode('Export GLTF'));
    action.appendChild(tooltip);
    container.appendChild(action);
  }
}

export default Exporter;
