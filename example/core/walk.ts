import {
  Box3,
  Group,
  Line3,
  PerspectiveCamera,
  Vector3
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh';

const _tempBox = new Box3();
const _tempSegment = new Line3();
const _tempVector = new Vector3();
const _tempVector2 = new Vector3();
const _upVector = new Vector3(0, 1, 0);

class Walk {
  private enabled: boolean = false;
  private camera: PerspectiveCamera;
  private controls: OrbitControls;
  private world: Group;
  private bvh?: MeshBVH;
  private gravity: number = -30;
  private capsule: {
    radius: number;
    segment: Line3;
  } = {
    radius: 0.5,
    segment: new Line3(new Vector3(), new Vector3(0, -2.0, 0.0))
  };
  private playerPosition: Vector3 = new Vector3();
  private playerSpeed: number = 10;
  private playerVelocity: Vector3 = new Vector3();
  private playerIsOnGround: boolean = false;
  private fwdPressed: boolean = false;
  private bkdPressed: boolean = false;
  private lftPressed: boolean = false;
  private rgtPressed: boolean = false;

  constructor(camera: PerspectiveCamera, controls: OrbitControls, world: Group) {
    this.camera = camera;
    this.controls = controls;
    this.world = world;
    this.blur = this.blur.bind(this);
    this.keydown = this.keydown.bind(this);
    this.keyup = this.keyup.bind(this);
    window.addEventListener('blur', this.blur);
    document.addEventListener('keydown', this.keydown);
    document.addEventListener('keyup', this.keyup);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private blur() {
    const { playerVelocity } = this;
    playerVelocity.set(0, 0, 0);
    this.fwdPressed = this.bkdPressed = this.rgtPressed = this.lftPressed = false;
  }

  private keydown(e: KeyboardEvent) {
    const { playerIsOnGround, playerVelocity } = this;
    switch (e.code) {
      case 'KeyW': this.fwdPressed = true; break;
      case 'KeyS': this.bkdPressed = true; break;
      case 'KeyD': this.rgtPressed = true; break;
      case 'KeyA': this.lftPressed = true; break;
      case 'Space':
        if (playerIsOnGround) {
          playerVelocity.y = 10.0;
        }
        break;
    }
  }

  private keyup(e: KeyboardEvent) {
    switch (e.code) {
      case 'KeyW': this.fwdPressed = false; break;
      case 'KeyS': this.bkdPressed = false; break;
      case 'KeyD': this.rgtPressed = false; break;
      case 'KeyA': this.lftPressed = false; break;
    }
  }
  
  toggle(): boolean {
    const { camera, controls, playerPosition, playerVelocity, world } = this;
    this.enabled = !this.enabled;
    if (this.enabled) {
      controls.maxDistance = 1e-4;
      controls.minDistance = 1e-4;
      controls.enableRotate = true;
      controls.enablePan = false;
      playerPosition.copy(camera.position);
      const staticGenerator = new StaticGeometryGenerator(
        world.children.filter(({ visible }) => visible).map(({ triangles }: any) => triangles)
      );
      staticGenerator.attributes = ['position'];
      this.bvh = new MeshBVH(staticGenerator.generate());
    } else {
      controls.maxDistance = 96;
      controls.minDistance = 4;
      controls.enableRotate = false;
      controls.enablePan = false;
      controls.target.set(0, 8, 0);
      camera.position.set(0, 16, 32);
      playerVelocity.set(0, 0, 0);
      this.fwdPressed = this.bkdPressed = this.rgtPressed = this.lftPressed = false;
    }
    return this.enabled;
  }

  update(delta: number) {
    const {
      camera, controls, bvh,
      enabled,
      capsule, gravity, playerPosition, playerSpeed, playerVelocity,
      fwdPressed, bkdPressed, lftPressed, rgtPressed,
    } = this;

    if (!enabled || !bvh) {
      return;
    }

    playerVelocity.y += this.playerIsOnGround ? 0 : delta * gravity;
    playerPosition.addScaledVector(playerVelocity, delta);

    const angle = controls.getAzimuthalAngle();
    if (fwdPressed) {
      _tempVector.set(0, 0, -1).applyAxisAngle(_upVector, angle);
      playerPosition.addScaledVector(_tempVector, playerSpeed * delta);
    }
    if (bkdPressed) {
      _tempVector.set(0, 0, 1).applyAxisAngle(_upVector, angle);
      playerPosition.addScaledVector(_tempVector, playerSpeed * delta);
    }
    if (lftPressed) {
      _tempVector.set(-1, 0, 0).applyAxisAngle(_upVector, angle);
      playerPosition.addScaledVector(_tempVector, playerSpeed * delta);
    }
    if (rgtPressed) {
      _tempVector.set(1, 0, 0).applyAxisAngle(_upVector, angle);
      playerPosition.addScaledVector(_tempVector, playerSpeed * delta);
    }

    _tempBox.makeEmpty();
    _tempSegment.copy(capsule.segment);
    _tempSegment.start.add(playerPosition);
    _tempSegment.end.add(playerPosition);
    _tempBox.expandByPoint(_tempSegment.start);
    _tempBox.expandByPoint(_tempSegment.end);
    _tempBox.min.addScalar(-capsule.radius);
    _tempBox.max.addScalar(capsule.radius);

    bvh.shapecast({
      intersectsBounds: (box) => box.intersectsBox(_tempBox),
      intersectsTriangle: (tri) => {
        const triPoint = _tempVector;
        const capsulePoint = _tempVector2;
        const distance = tri.closestPointToSegment(_tempSegment, triPoint, capsulePoint);
        if (distance < capsule.radius) {
          const depth = capsule.radius - distance;
          const direction = capsulePoint.sub( triPoint ).normalize();
          _tempSegment.start.addScaledVector( direction, depth );
          _tempSegment.end.addScaledVector( direction, depth );
        }
      }
    });

    const newPosition = _tempVector;
    newPosition.copy(_tempSegment.start);
    const deltaVector = _tempVector2;
    deltaVector.subVectors(newPosition, playerPosition);
    this.playerIsOnGround = deltaVector.y > Math.abs(delta * playerVelocity.y * 0.25);

    const offset = Math.max(0.0, deltaVector.length() - 1e-5);
    deltaVector.normalize().multiplyScalar(offset);
    playerPosition.add(deltaVector);

    if (!this.playerIsOnGround) {
      deltaVector.normalize();
      playerVelocity.addScaledVector(deltaVector, - deltaVector.dot(playerVelocity));
    } else {
      playerVelocity.set(0, 0, 0);
    }

    camera.position.sub(controls.target);
    controls.target.copy(playerPosition);
    camera.position.add(playerPosition);
  }
}

export default Walk;
