import { Material } from 'three';

export type Geometry = {
  bounds: Float32Array;
  vertices: Float32Array;
  voxels: Float32Array;
};

export type Materials = {
  triangles: Material;
  voxels: Material;
};
