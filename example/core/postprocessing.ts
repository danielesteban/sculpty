import {
  Color,
  GLSL3,
  Mesh,
  HalfFloatType,
  PerspectiveCamera,
  PlaneGeometry,
  RawShaderMaterial,
  Scene,
  Vector2,
  Vector3,
  WebGLMultipleRenderTargets,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

const _clearColor = new Color();
const _vertex = /* glsl */`
  precision highp int;
  precision highp float;
  in vec3 position;
  out vec2 uv;
  uniform int flipY;
  void main() {
    gl_Position = vec4(position.xy, 0, 1);
    uv = position.xy * 0.5 + 0.5;
    if (flipY == 1) {
      uv.y = 1.0 - uv.y;
    }
  }
`;

const _fragment = /* glsl */`
  precision highp int;
  precision highp float;
  in vec2 uv;
  out vec4 fragColor;
  uniform sampler2D colorTexture;
  uniform sampler2D normalTexture;
  uniform sampler2D positionTexture;
  uniform vec2 resolution;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform vec3 cameraPosition;
  uniform float intensity;
  uniform float thickness;
  uniform float depthBias;
  uniform float depthScale;
  uniform float normalBias;
  uniform float normalScale;
  #define saturate(a) clamp(a, 0.0, 1.0)
  float getDepth(const in vec3 position) {
    float depth = length(position - cameraPosition);
    return (depth - cameraNear) / (cameraFar - cameraNear);
  }
  vec3 LinearToSRGB(const in vec3 value) {
    return vec3(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))));
  }
  vec3 SobelSample(const in sampler2D tex, const in vec2 uv, const in vec3 offset) {
    vec3 pixelCenter = texture(tex, uv).rgb;
    vec3 pixelLeft   = texture(tex, uv - offset.xz).rgb;
    vec3 pixelRight  = texture(tex, uv + offset.xz).rgb;
    vec3 pixelUp     = texture(tex, uv + offset.zy).rgb;
    vec3 pixelDown   = texture(tex, uv - offset.zy).rgb;
    return (
      abs(pixelLeft    - pixelCenter)
      + abs(pixelRight - pixelCenter)
      + abs(pixelUp    - pixelCenter)
      + abs(pixelDown  - pixelCenter)
    );
  }
  float SobelSampleDepth(const in sampler2D tex, const in vec2 uv, const in vec3 offset) {
    float pixelCenter = getDepth(texture(tex, uv).xyz);
    float pixelLeft   = getDepth(texture(tex, uv - offset.xz).xyz);
    float pixelRight  = getDepth(texture(tex, uv + offset.xz).xyz);
    float pixelUp     = getDepth(texture(tex, uv + offset.zy).xyz);
    float pixelDown   = getDepth(texture(tex, uv - offset.zy).xyz);
    return (
      abs(pixelLeft    - pixelCenter)
      + abs(pixelRight - pixelCenter)
      + abs(pixelUp    - pixelCenter)
      + abs(pixelDown  - pixelCenter)
    );
  }
  float edge(const in vec2 uv) {
    vec3 offset = vec3((1.0 / resolution.x), (1.0 / resolution.y), 0.0) * thickness;
    float sobelDepth = SobelSampleDepth(positionTexture, uv, offset);
    sobelDepth = pow(saturate(sobelDepth) * depthScale, depthBias);
    vec3 sobelNormalVec = SobelSample(normalTexture, uv, offset);
    float sobelNormal = sobelNormalVec.x + sobelNormalVec.y + sobelNormalVec.z;
    sobelNormal = pow(sobelNormal * normalScale, normalBias);
    return saturate(max(sobelDepth, sobelNormal)) * intensity;
  }
  const vec3 background = vec3(0.06666666666666667, 0.13333333333333333, 0.2);
  void main() {
    vec3 color = texture(colorTexture, uv).rgb;
    float depth = length(texture(positionTexture, uv).xyz * vec3(1.0, 0.5, 1.0));
    float decay = (1.0 - exp(-0.02 * 0.02 * depth * depth));
    color = mix(color, background, decay);
    decay = (1.0 - exp(-0.015 * 0.015 * depth * depth));
    color = mix(color, vec3(0.0), edge(uv) * (1.0 - decay));
    fragColor = vec4(LinearToSRGB(color), 1.0);
  }
`;

class PostProcessing {
  private readonly target: WebGLMultipleRenderTargets;
  private readonly screen: Mesh;

  constructor({ samples }: { samples: number; }) {
    const plane = new PlaneGeometry(2, 2, 1, 1);
    plane.deleteAttribute('normal');
    plane.deleteAttribute('uv');
    this.target = new WebGLMultipleRenderTargets(window.innerWidth, window.innerHeight, 3, {
      samples,
      type: HalfFloatType,
    });
    this.screen = new Mesh(
      plane,
      new RawShaderMaterial({
        glslVersion: GLSL3,
        uniforms: {
          colorTexture: { value: this.target.texture[0] },
          normalTexture: { value: this.target.texture[1] },
          positionTexture: { value: this.target.texture[2] },
          resolution: { value: new Vector2((this.target as any).width, (this.target as any).height) },
          cameraNear: { value: 0 },
          cameraFar: { value: 0 },
          cameraPosition: { value: new Vector3() },
          flipY: { value: 0 },
          intensity: { value: 0.8 },
          thickness: { value: 1 },
          depthBias: { value: 1 },
          depthScale: { value: 40 },
          normalBias: { value: 40 },
          normalScale: { value: 1 },
        },
        vertexShader: _vertex,
        fragmentShader: _fragment,
      })
    );
    this.screen.frustumCulled = false;
    this.screen.matrixAutoUpdate = false;
  }

  setSize(width: number, height: number, flipY: boolean = false, pixelRatio: number = 1) {
    const { screen, target } = this;
    target.setSize(width, height);
    (screen.material as RawShaderMaterial).uniforms.resolution.value.set(width, height).divideScalar(pixelRatio);
    (screen.material as RawShaderMaterial).uniforms.flipY.value = flipY ? 1 : 0;
  }

  render(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera,
    scene: Scene,
    screenTarget: WebGLRenderTarget | null = null,
  ) {
    const { screen, target } = this;
    renderer.setClearColor(_clearColor.setRGB(camera.far, camera.far, camera.far), 1);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const { uniforms } = (screen.material as RawShaderMaterial);
    uniforms.cameraNear.value = camera.near;
    uniforms.cameraFar.value = camera.far;
    uniforms.cameraPosition.value.setFromMatrixPosition(camera.matrixWorld);
    renderer.setClearColor(_clearColor.setRGB(0, 0, 0), 1);
    renderer.setRenderTarget(screenTarget);
    renderer.render(screen, camera);
  }
}

export default PostProcessing;
