import {
  Clock,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import PostProcessing from './postprocessing';

class Viewport {
  private readonly animate: (delta: number) => void;
  private readonly clock: Clock;
  public readonly dom: HTMLElement;
  public readonly camera: PerspectiveCamera;
  public readonly postprocessing: PostProcessing;
  public readonly renderer: WebGLRenderer;
  public readonly scene: Scene;
  public needsUpdate: boolean = false;

  constructor(animate: (delta: number) => void) {
    const dom = document.getElementById('viewport');
    if (!dom) {
      throw new Error('Couldn\'t get viewport');
    }
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('touchstart', (e) => e.preventDefault());
    this.dom = dom;
    
    this.animate = animate;
    this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    this.clock = new Clock();
    this.renderer = new WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.scene = new Scene();
    this.scene.environment = (new PMREMGenerator(this.renderer)).fromScene(new RoomEnvironment(), 0.04).texture;
    this.postprocessing = new PostProcessing({ samples: 4 });

    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    dom.appendChild(this.renderer.domElement);

    document.addEventListener('visibilitychange', () => (
      document.visibilityState === 'visible' && this.clock.start()
    ));
    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  render() {
    const { camera, clock, postprocessing, renderer, scene } = this;
    this.animate(Math.min(clock.getDelta(), 1));
    if (this.needsUpdate) {
      this.needsUpdate = false;
      postprocessing.render(renderer, camera, scene);
    }
  }

  resize() {
    const { camera, postprocessing, renderer } = this;
    renderer.setSize(window.innerWidth, window.innerHeight);
    postprocessing.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    this.needsUpdate = true;
  }
}

export default Viewport;
