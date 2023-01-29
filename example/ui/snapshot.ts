import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import PostProcessing from '../core/postprocessing';
import { Snapshot as Icon } from './icons';

class Snapshot {
  constructor({
    camera,
    postprocessing,
    renderer,
    scene,
    width = 3840,
    height = 2160
  }: {
    camera: PerspectiveCamera;
    postprocessing: PostProcessing;
    renderer: WebGLRenderer;
    scene: Scene;
    width?: number;
    height?: number;
  }) {
    const container = document.getElementById('actions');
    if (!container) {
      throw new Error('Couldn\'t get UI container');
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Couldn\'t get 2D context');
    }
    const output = document.createElement('canvas');
    const outputCtx = output.getContext('2d');
    if (!outputCtx) {
      throw new Error('Couldn\'t get 2D context');
    }
    const downloader = document.createElement('a');
    downloader.download = 'sculpty.png';
    downloader.style.display = 'none';
    const pixels = new ImageData(width, height);
    const target = new WebGLRenderTarget(width, height);
    const action = document.createElement('div');
    action.className = 'action';
    const button = document.createElement('button');
    button.appendChild(Icon());
    button.addEventListener('click', () => {
      renderer.setSize(width, height);
      postprocessing.setSize(width, height, true, 2);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      postprocessing.render(renderer, camera, scene, target);
      renderer.setSize(window.innerWidth, window.innerHeight);
      postprocessing.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels.data);
      canvas.width = width;
      canvas.height = height;
      ctx.putImageData(pixels, 0, 0);
      output.width = width * 0.5;
      output.height = height * 0.5;
      outputCtx.imageSmoothingQuality = 'high';
      outputCtx.drawImage(canvas, 0, 0, width, height, 0, 0, output.width, output.height);
      output.toBlob((blob) => {
        if (!blob) {
          return;
        }
        if (downloader.href) {
          URL.revokeObjectURL(downloader.href);
        }
        downloader.href = URL.createObjectURL(blob);
        downloader.click();
      });
    });
    action.appendChild(button);
    action.appendChild(downloader);
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.appendChild(document.createTextNode('Take snapshot'));
    action.appendChild(tooltip);
    container.appendChild(action);
  }
}

export default Snapshot;
