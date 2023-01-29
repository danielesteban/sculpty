import { MeshStandardMaterial } from 'three';

export default () => {
  const triangles = new MeshStandardMaterial({
    envMapIntensity: 0.5,
    vertexColors: true,
    metalness: 0.2,
    roughness: 0.8,
  });
  triangles.defines = {
    USE_OUTPUT_NORMAL: 1,
    USE_OUTPUT_POSITION: 1,
  };
  
  const voxels = new MeshStandardMaterial({
    envMapIntensity: 0.5,
    vertexColors: true,
    visible: false,
  });
  voxels.defines = {
    USE_INSTANCED_POSITION: 1,
    USE_OUTPUT_NORMAL: 1,
    USE_OUTPUT_POSITION: 1,
  };

  return { triangles, voxels };
};
