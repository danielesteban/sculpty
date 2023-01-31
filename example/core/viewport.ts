import {
  Clock,
  EventDispatcher,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import PostProcessing from './postprocessing';

export type Pointer = {
  id: number;
  button: number;
  position: Vector2;
};

class Viewport extends EventDispatcher {
  private readonly animate: (delta: number) => void;
  private readonly clock: Clock;
  public readonly dom: HTMLElement;
  public readonly camera: PerspectiveCamera;
  private readonly pointer: Pointer;
  public readonly postprocessing: PostProcessing;
  public readonly renderer: WebGLRenderer;
  public readonly scene: Scene;
  public needsUpdate: boolean = false;

  constructor(animate: (delta: number) => void) {
    super();
    const dom = document.getElementById('viewport');
    if (!dom) {
      throw new Error('Couldn\'t get viewport');
    }
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('touchstart', (e) => e.preventDefault());
    dom.addEventListener('pointerdown', this.pointerdown.bind(this));
    dom.addEventListener('pointermove', this.pointermove.bind(this));
    dom.addEventListener('pointerup', this.pointerup.bind(this));
    this.dom = dom;
    
    this.animate = animate;
    this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    this.clock = new Clock();
    this.pointer = {
      id: -1,
      button: -1,
      position: new Vector2()
    };
    this.postprocessing = new PostProcessing({ samples: 4 });
    this.renderer = new WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.scene = new Scene();
    this.scene.environment = (new PMREMGenerator(this.renderer)).fromScene(new RoomEnvironment(), 0.04).texture;

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

  private getPointer({ buttons, clientX, clientY, pointerId }: PointerEvent) {
    this.pointer.id = pointerId;
    this.pointer.button = buttons;
    this.pointer.position.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    return this.pointer;
  }

  private pointerdown(e: PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (this.pointer.id === -1) {
      const pointer = this.getPointer(e);
      this.dispatchEvent({ type: 'dragstart', pointer, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
    }
  }

  private pointermove(e: PointerEvent) {
    if (e.pointerId !== this.pointer.id) {
      return;
    }
    (('getCoalescedEvents' in e) ? e.getCoalescedEvents() : [e]).forEach((e) => {
      const pointer = this.getPointer(e);
      this.dispatchEvent({ type: 'dragmove', pointer });
    });
  }

  private pointerup(e: PointerEvent) {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (e.pointerId === this.pointer.id) {
      const pointer = this.getPointer(e);
      this.dispatchEvent({ type: 'dragend', pointer });
      this.pointer.id = -1;
    }
  }
}

export default Viewport;
