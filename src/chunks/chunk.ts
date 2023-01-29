import { Group, Vector3 } from 'three';
import { Geometry, Materials } from './types';
import TriangleChunk from './triangles';
import VoxelChunk from './voxels';

class Chunk extends Group {
  private readonly triangles: TriangleChunk;
  private readonly voxels: VoxelChunk;
  public request: number = 0;
  public version: number = 0;

  constructor({
    geometry,
    materials,
    position,
  }: {
    geometry?: Geometry;
    materials: Materials;
    position: Vector3;
  }) {
    super();
    this.position.copy(position);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.triangles = new TriangleChunk(materials.triangles);
    this.add(this.triangles);
    this.voxels = new VoxelChunk(materials.voxels);
    this.add(this.voxels);
    this.update(geometry);
  }

  dispose() {
    const { triangles, voxels } = this;
    triangles.dispose();
    voxels.dispose();
  }

  update(geometry?: Geometry) {
    if (!geometry) {
      this.visible = false;
      return;
    }
    const { triangles, voxels } = this;
    triangles.update(geometry);
    voxels.update(geometry);
    voxels.geometry.boundingBox = triangles.geometry.boundingBox;
    voxels.geometry.boundingSphere = triangles.geometry.boundingSphere;
    this.visible = true;
  }
}

export default Chunk;
