import { ShaderChunk } from 'three';

const _pars_vertex = /* glsl */`
  #ifdef USE_INSTANCED_POSITION
  attribute vec3 instance;
  #endif
  #ifdef USE_OUTPUT_NORMAL
  varying vec3 fragNormal;
  #endif
  #ifdef USE_OUTPUT_POSITION
  varying vec3 fragPosition;
  #endif
`;

const _vertex = /* glsl */`
  #ifdef USE_INSTANCED_POSITION
  transformed += instance;
  #endif
  #ifdef USE_OUTPUT_NORMAL
  vec3 outputNormal = vec3(normal);
  #ifdef USE_INSTANCING
    mat3 nm = mat3(instanceMatrix);
    outputNormal /= vec3(dot(nm[0], nm[0]), dot(nm[1], nm[1]), dot(nm[2], nm[2]));
    outputNormal = nm * outputNormal;
  #endif
  fragNormal = normalMatrix * outputNormal;
  #endif
  #ifdef USE_OUTPUT_POSITION
  vec4 outputPosition = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  outputPosition = instanceMatrix * outputPosition;
  #endif
  outputPosition = modelMatrix * outputPosition;
  fragPosition = outputPosition.xyz;
  #endif
`;

const _pars_fragment= /* glsl */`
  #ifdef USE_OUTPUT_NORMAL
  layout(location = 1) out vec4 pc_fragNormal;
  varying vec3 fragNormal;
  #endif
  #ifdef USE_OUTPUT_POSITION
  layout(location = 2) out vec4 pc_fragPosition;
  varying vec3 fragPosition;
  #endif
`;

const _fragment = /* glsl */`
  #ifdef USE_OUTPUT_NORMAL
  pc_fragNormal = vec4(normalize(fragNormal), 0.0);
  #endif
  #ifdef USE_OUTPUT_POSITION
  pc_fragPosition = vec4(fragPosition, 0.0);
  #endif
`;

export default () => {
  ShaderChunk.skinning_pars_vertex += _pars_vertex;
  ShaderChunk.skinning_vertex += _vertex;
  ShaderChunk.clipping_planes_pars_fragment += _pars_fragment;
  ShaderChunk.clipping_planes_fragment += _fragment;
};
