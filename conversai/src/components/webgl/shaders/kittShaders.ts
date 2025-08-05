/**
 * KITT-themed WebGL Shaders
 * Custom shaders for holographic effects, scanning animations, and voice visualization
 */

export const kittVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  uniform float time;
  uniform float audioLevel;
  uniform float scannerPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;
    
    // Audio-reactive vertex displacement
    vec3 pos = position;
    float wave = sin(pos.y * 10.0 + time * 2.0) * audioLevel * 0.1;
    pos.x += wave * 0.5;
    pos.z += wave * 0.3;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const kittFragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  uniform float time;
  uniform float audioLevel;
  uniform float scannerPosition;
  uniform float opacity;
  uniform vec3 kittRed;
  uniform bool isScanning;
  uniform bool isHolographic;
  
  void main() {
    vec3 color = kittRed;
    float alpha = opacity;
    
    // Scanner effect
    if (isScanning) {
      float scanDistance = abs(vPosition.x - scannerPosition);
      float scanIntensity = 1.0 - smoothstep(0.0, 0.5, scanDistance);
      color = mix(color, vec3(1.0, 1.0, 1.0), scanIntensity * 0.5);
      alpha += scanIntensity * 0.3;
    }
    
    // Holographic interference
    if (isHolographic) {
      float interference = sin(vUv.y * 100.0 + time * 5.0) * 0.1;
      float flicker = sin(time * 20.0) * 0.05;
      alpha += interference + flicker;
      
      // RGB shift effect
      color.r += sin(vUv.y * 50.0 + time) * 0.1;
      color.g += sin(vUv.y * 50.0 + time + 1.0) * 0.1;
      color.b += sin(vUv.y * 50.0 + time + 2.0) * 0.1;
    }
    
    // Audio reactivity
    float audioGlow = sin(time * 10.0) * audioLevel * 0.3;
    color += audioGlow;
    alpha += audioGlow * 0.2;
    
    // Edge glow
    float fresnel = 1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
    alpha += fresnel * 0.4;
    
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

export const voiceVisualizerVertexShader = `
  attribute float audioData;
  attribute float delay;
  
  varying vec2 vUv;
  varying float vAudioData;
  varying float vDelay;
  
  uniform float time;
  uniform float globalAudioLevel;
  uniform float bassLevel;
  uniform float midLevel;
  uniform float trebleLevel;
  
  void main() {
    vUv = uv;
    vAudioData = audioData;
    vDelay = delay;
    
    vec3 pos = position;
    
    // Frequency-based scaling
    float frequencyScale = 1.0;
    if (pos.y < 0.33) {
      frequencyScale = bassLevel * 2.0;
    } else if (pos.y < 0.66) {
      frequencyScale = midLevel * 1.5;
    } else {
      frequencyScale = trebleLevel * 1.2;
    }
    
    // Audio-reactive height
    pos.y *= (0.1 + audioData * frequencyScale * 3.0);
    
    // Wave propagation
    float wave = sin(pos.x * 0.5 + time * 3.0 + delay) * globalAudioLevel * 0.2;
    pos.z += wave;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const voiceVisualizerFragmentShader = `
  varying vec2 vUv;
  varying float vAudioData;
  varying float vDelay;
  
  uniform float time;
  uniform vec3 kittRed;
  uniform float globalAudioLevel;
  
  void main() {
    vec3 color = kittRed;
    
    // Height-based color variation
    float heightFactor = vUv.y;
    color = mix(vec3(0.2, 0.0, 0.0), kittRed, heightFactor);
    color = mix(color, vec3(1.0, 0.5, 0.5), heightFactor * vAudioData);
    
    // Audio-reactive intensity
    float intensity = 0.3 + vAudioData * 0.7 + globalAudioLevel * 0.5;
    
    // Pulsing effect
    float pulse = sin(time * 5.0 + vDelay) * 0.2 + 0.8;
    intensity *= pulse;
    
    // Edge fade
    float edgeFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
    intensity *= edgeFade;
    
    gl_FragColor = vec4(color * intensity, intensity);
  }
`;

export const particleVertexShader = `
  attribute float size;
  attribute float alpha;
  attribute vec3 customColor;
  
  varying float vAlpha;
  varying vec3 vColor;
  
  uniform float time;
  uniform float audioLevel;
  
  void main() {
    vAlpha = alpha;
    vColor = customColor;
    
    vec3 pos = position;
    
    // Audio-reactive particle movement
    pos.y += sin(time + pos.x * 0.1) * audioLevel * 0.5;
    pos.x += cos(time * 0.5 + pos.z * 0.1) * audioLevel * 0.3;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Audio-reactive size
    float finalSize = size * (1.0 + audioLevel * 0.5);
    gl_PointSize = finalSize * (300.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const particleFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  
  uniform float time;
  uniform float audioLevel;
  
  void main() {
    // Circular particle shape
    vec2 center = gl_PointCoord - vec2(0.5);
    float distance = length(center);
    
    if (distance > 0.5) discard;
    
    // Soft edges
    float alpha = 1.0 - smoothstep(0.3, 0.5, distance);
    alpha *= vAlpha;
    
    // Audio-reactive pulse
    alpha *= 0.7 + sin(time * 8.0) * audioLevel * 0.3;
    
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export const holographicTextVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  uniform float time;
  uniform float scanLine;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    
    // Gentle text floating
    pos.y += sin(time * 2.0 + pos.x * 0.1) * 0.02;
    pos.z += cos(time * 1.5 + pos.x * 0.05) * 0.01;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const holographicTextFragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  uniform float time;
  uniform float scanLine;
  uniform float opacity;
  uniform vec3 textColor;
  uniform bool isUser;
  uniform sampler2D fontTexture;
  
  void main() {
    vec3 color = textColor;
    float alpha = opacity;
    
    // Scan line effect
    float scanDistance = abs(vPosition.y - scanLine);
    float scanIntensity = 1.0 - smoothstep(0.0, 0.1, scanDistance);
    color = mix(color, vec3(1.0), scanIntensity * 0.8);
    alpha += scanIntensity * 0.3;
    
    // Holographic interference
    float interference = sin(vUv.y * 200.0 + time * 10.0) * 0.1;
    alpha += interference;
    
    // RGB chromatic shift for holographic effect
    if (!isUser) {
      color.r += sin(vUv.y * 100.0 + time) * 0.1;
      color.g += sin(vUv.y * 100.0 + time + 2.0) * 0.1;
      color.b += sin(vUv.y * 100.0 + time + 4.0) * 0.1;
    }
    
    // Edge glow
    float edgeGlow = 1.0 - min(vUv.x, 1.0 - vUv.x) * 2.0;
    edgeGlow = pow(edgeGlow, 3.0) * 0.5;
    alpha += edgeGlow;
    
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

// Shader material configurations
export const createKittMaterial = (uniforms: any) => ({
  vertexShader: kittVertexShader,
  fragmentShader: kittFragmentShader,
  uniforms: {
    time: { value: 0 },
    audioLevel: { value: 0 },
    scannerPosition: { value: 0 },
    opacity: { value: 0.8 },
    kittRed: { value: [0.937, 0.267, 0.267] }, // RGB for #EF4444
    isScanning: { value: false },
    isHolographic: { value: true },
    ...uniforms
  },
  transparent: true,
  side: 2, // DoubleSide
});

export const createVoiceVisualizerMaterial = (uniforms: any) => ({
  vertexShader: voiceVisualizerVertexShader,
  fragmentShader: voiceVisualizerFragmentShader,
  uniforms: {
    time: { value: 0 },
    kittRed: { value: [0.937, 0.267, 0.267] },
    globalAudioLevel: { value: 0 },
    bassLevel: { value: 0 },
    midLevel: { value: 0 },
    trebleLevel: { value: 0 },
    ...uniforms
  },
  transparent: true,
});

export const createParticleMaterial = (uniforms: any) => ({
  vertexShader: particleVertexShader,
  fragmentShader: particleFragmentShader,
  uniforms: {
    time: { value: 0 },
    audioLevel: { value: 0 },
    ...uniforms
  },
  transparent: true,
  depthWrite: false,
  blending: 2, // AdditiveBlending
});

export const createHolographicTextMaterial = (uniforms: any) => ({
  vertexShader: holographicTextVertexShader,
  fragmentShader: holographicTextFragmentShader,
  uniforms: {
    time: { value: 0 },
    scanLine: { value: 0 },
    opacity: { value: 0.9 },
    textColor: { value: [0.937, 0.267, 0.267] },
    isUser: { value: false },
    fontTexture: { value: null },
    ...uniforms
  },
  transparent: true,
});