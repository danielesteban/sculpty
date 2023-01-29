import {
  Box3,
  BufferGeometry,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Mesh,
  Material,
  Sphere,
} from 'three';
import { Geometry } from './types';

class TriangleChunk extends Mesh {
  constructor(material: Material) {
    super(new BufferGeometry(), material);
    this.castShadow = true;
    this.receiveShadow = true;
    this.matrixAutoUpdate = false;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  override raycast() {
    return;
  }

  update({ bounds, vertices }: Geometry) {
    const { geometry } = this;
    const buffer = new InterleavedBuffer(vertices, 9);
    geometry.setAttribute('position', new InterleavedBufferAttribute(buffer, 3, 0));
    geometry.setAttribute('normal', new InterleavedBufferAttribute(buffer, 3, 3));
    geometry.setAttribute('color', new InterleavedBufferAttribute(buffer, 3, 6));
    if (!geometry.boundingBox) {
      geometry.boundingBox = new Box3();
    }
    geometry.boundingBox.min.set(bounds[0], bounds[1], bounds[2]);
    geometry.boundingBox.max.set(bounds[3], bounds[4], bounds[5]);
    if (!geometry.boundingSphere) {
      geometry.boundingSphere = new Sphere();
    }
    geometry.boundingBox.getBoundingSphere(geometry.boundingSphere);
  }
}

export default TriangleChunk;
