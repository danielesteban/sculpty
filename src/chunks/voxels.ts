import {
  BoxGeometry,
  Color,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  Intersection,
  Matrix4,
  Mesh,
  Material,
  Object3D,
  Raycaster,
  Sphere,
  Vector3,
} from 'three';
import { Geometry } from './types';

const _color = new Color();
const _instance = new Mesh(new BoxGeometry(1, 1, 1));
const _intersects: Intersection<Object3D<Event>>[] = [];
const _sphere = new Sphere();
const _translation = new Matrix4();
const _voxel = new Vector3();

class Chunk extends Mesh {
  constructor(material: Material) {
    const geometry = new InstancedBufferGeometry();
    geometry.boundingSphere = new Sphere();
    geometry.setIndex(_instance.geometry.getIndex());
    geometry.setAttribute('position', _instance.geometry.getAttribute('position'));
    geometry.setAttribute('normal', _instance.geometry.getAttribute('normal'));
    super(geometry, material);
    this.castShadow = true;
    this.receiveShadow = true;
    this.matrixAutoUpdate = false;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }
  
  getColor(instance: number) {
    const { geometry } = this;
    const color = geometry.getAttribute('color');
    return _color.fromBufferAttribute(color as any, instance).convertLinearToSRGB();
  }

  override raycast(raycaster: Raycaster, intersects: Intersection<Object3D<Event>>[]) {
    const { geometry, matrixWorld, parent } = this;
    if (!parent?.visible || !geometry.boundingSphere) {
      return;
    }
    _sphere.copy(geometry.boundingSphere);
    _sphere.applyMatrix4(matrixWorld);
    if (!raycaster.ray.intersectsSphere(_sphere)) {
      return;
    }
    const instance = geometry.getAttribute('instance');
    for (let i = 0, l = (geometry as InstancedBufferGeometry).instanceCount; i < l; i++) {
      _voxel.fromBufferAttribute(instance, i);
      _instance.matrixWorld
        .multiplyMatrices(matrixWorld, _translation.makeTranslation(_voxel.x, _voxel.y, _voxel.z));
      _instance.raycast(raycaster, _intersects);
      _intersects.forEach((intersect) => {
        intersect.object = this as any;
        intersect.instanceId = i;
        intersects.push(intersect);
      });
      _intersects.length = 0;
    }
  }

  update({ voxels }: Geometry) {
    const { geometry } = this;
    const buffer = new InstancedInterleavedBuffer(voxels, 6, 1);
    geometry.setAttribute('instance', new InterleavedBufferAttribute(buffer, 3, 0));
    geometry.setAttribute('color', new InterleavedBufferAttribute(buffer, 3, 3));
    (geometry as InstancedBufferGeometry).instanceCount = (geometry as any)._maxInstanceCount = buffer.count;
  }
}

export default Chunk;
