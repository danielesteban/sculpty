import { World } from 'sculpty';
import {
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Vector3
} from 'three';
import { Pointer } from './input';
import Color from '../ui/color';
import Orientation, { OrientationMode } from '../ui/orientation';
import Size from '../ui/size';

const _center = new Vector3(0.5, 0.5, 0.5);
const _vector = new Vector3();

class Drawing {
  private action: number = 0;
  private isEnabled: boolean = false;
  private isEraser: boolean = false;
  private isPaint: boolean = false;
  private readonly lastPosition: Vector3 = new Vector3();
  private readonly plane: Mesh = new Mesh(new PlaneGeometry(10000, 10000, 1, 1));
  private readonly raycaster: Raycaster = new Raycaster(undefined, undefined, 0, 128);
  private readonly camera: PerspectiveCamera;
  private readonly color: Color;
  private readonly orientation: Orientation;
  private readonly size: Size;
  private readonly world: World;

  constructor(
    camera: PerspectiveCamera,
    color: Color,
    orientation: Orientation,
    size: Size,
    world: World
  ) {
    this.camera = camera;
    this.color = color;
    this.orientation = orientation;
    this.size = size;
    this.world = world;
  }

  start({ pointer, ctrlKey, shiftKey }: { pointer: Pointer; ctrlKey: boolean; shiftKey: boolean; }) {
    if (
      (ctrlKey && pointer.button !== 1)
      || (shiftKey && pointer.button !== 1)
    ) {
      return;
    }
  
    const { camera, color, orientation, plane, raycaster, world } = this;
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
   
    this.action++;
    this.isEnabled = true;
    this.isEraser = ctrlKey || pointer.button === 2;
    this.isPaint = shiftKey;
    hit.point
      .addScaledVector(hit.face.normal, 0.25 * ((this.isEraser || this.isPaint) ? -1 : 1))
      .floor();
    this.draw(hit.point);
  
    plane.position.copy(hit.point).add(_center);
    switch (orientation.mode) {
      default:
        plane.quaternion.copy(camera.quaternion);
        break;
      case OrientationMode.surface:
        plane.lookAt(_vector.addVectors(plane.position, hit.face.normal));
        break;
    }
    plane.updateMatrixWorld();
  }

  move({ pointer }: { pointer: Pointer; }) {
    const { camera, isEnabled, isEraser, isPaint, lastPosition, plane, raycaster, world } = this;
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
        .addScaledVector(hit.face.normal, 0.25 * ((isEraser || isPaint) ? -1 : 1));
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
    this.draw(hit.point);
  }

  end() {
    this.isEnabled = false;
  }

  private draw(position: Vector3) {
    const { action, color, isEraser, isPaint, lastPosition, size, world } = this;
    let value;
    let r, g, b;
    if (isEraser) {
      value = 0;
    } else {
      if (!isPaint) {
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
    world.update(updates, action);
    lastPosition.copy(position);
  }
}

export default Drawing;
