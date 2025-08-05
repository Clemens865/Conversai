/**
 * WebGL Detection and Capability Assessment
 * Provides comprehensive WebGL support detection with fallback strategies
 */

import { useState, useEffect } from 'react';

export interface WebGLCapabilities {
  webgl1: boolean;
  webgl2: boolean;
  maxTextureSize: number;
  maxVertexAttributes: number;
  maxFragmentTextureUnits: number;
  extensions: string[];
  performance: 'high' | 'medium' | 'low' | 'none';
  mobile: boolean;
  recommend3D: boolean;
}

export class WebGLDetector {
  private static instance: WebGLDetector;
  private capabilities: WebGLCapabilities | null = null;

  static getInstance(): WebGLDetector {
    if (!this.instance) {
      this.instance = new WebGLDetector();
    }
    return this.instance;
  }

  getCapabilities(): WebGLCapabilities {
    if (this.capabilities) {
      return this.capabilities;
    }

    this.capabilities = this.detectCapabilities();
    return this.capabilities;
  }

  private detectCapabilities(): WebGLCapabilities {
    const canvas = document.createElement('canvas');
    const mobile = this.isMobile();
    
    // Test WebGL 1.0
    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const webgl1 = !!gl1;
    
    // Test WebGL 2.0
    const gl2 = canvas.getContext('webgl2');
    const webgl2 = !!gl2;
    
    const gl = gl2 || gl1;
    
    if (!gl) {
      return {
        webgl1: false,
        webgl2: false,
        maxTextureSize: 0,
        maxVertexAttributes: 0,
        maxFragmentTextureUnits: 0,
        extensions: [],
        performance: 'none',
        mobile,
        recommend3D: false,
      };
    }

    // Get WebGL parameters
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    const maxFragmentTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    
    // Get supported extensions
    const extensions = gl.getSupportedExtensions() || [];
    
    // Assess performance
    const performance = this.assessPerformance(gl, mobile, maxTextureSize, extensions);
    
    // Recommend 3D based on capabilities
    const recommend3D = this.shouldRecommend3D(performance, mobile, webgl1);

    canvas.remove();

    return {
      webgl1,
      webgl2,
      maxTextureSize,
      maxVertexAttributes,
      maxFragmentTextureUnits,
      extensions,
      performance,
      mobile,
      recommend3D,
    };
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  private assessPerformance(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    mobile: boolean,
    maxTextureSize: number,
    extensions: string[]
  ): 'high' | 'medium' | 'low' | 'none' {
    let score = 0;

    // Base WebGL support
    score += 10;

    // Large texture support
    if (maxTextureSize >= 4096) score += 15;
    else if (maxTextureSize >= 2048) score += 10;
    else if (maxTextureSize >= 1024) score += 5;

    // Important extensions
    const importantExtensions = [
      'OES_vertex_array_object',
      'ANGLE_instanced_arrays',
      'OES_texture_float',
      'WEBGL_depth_texture',
      'EXT_shader_texture_lod'
    ];
    
    importantExtensions.forEach(ext => {
      if (extensions.includes(ext)) score += 5;
    });

    // Mobile penalty
    if (mobile) score -= 15;

    // Renderer info (if available)
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (renderer.includes('Mali') || renderer.includes('Adreno')) {
        score -= 5; // Mobile GPU
      } else if (renderer.includes('NVIDIA') || renderer.includes('AMD')) {
        score += 10; // Desktop GPU
      }
    }

    if (score >= 40) return 'high';
    if (score >= 25) return 'medium';
    if (score >= 15) return 'low';
    return 'none';
  }

  private shouldRecommend3D(
    performance: 'high' | 'medium' | 'low' | 'none',
    mobile: boolean,
    webgl1: boolean
  ): boolean {
    if (!webgl1) return false;
    if (performance === 'none') return false;
    if (mobile && performance === 'low') return false;
    return true;
  }

  // Performance monitoring
  startPerformanceMonitoring() {
    if (typeof window === 'undefined') return null;

    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 60;

    const monitor = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        // Adjust quality based on FPS
        if (fps < 30) {
          this.triggerPerformanceAdjustment('reduce');
        } else if (fps > 55) {
          this.triggerPerformanceAdjustment('increase');
        }
      }
      
      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
    return () => fps;
  }

  private triggerPerformanceAdjustment(direction: 'reduce' | 'increase') {
    // Custom event for components to listen to
    window.dispatchEvent(new CustomEvent('webgl-performance-adjust', {
      detail: { direction, timestamp: Date.now() }
    }));
  }
}

// Singleton instance
export const webglDetector = WebGLDetector.getInstance();

// React hook for easy component integration
export function useWebGLCapabilities() {
  const [capabilities, setCapabilities] = useState<WebGLCapabilities | null>(null);
  
  useEffect(() => {
    setCapabilities(webglDetector.getCapabilities());
  }, []);

  return capabilities;
}

// Higher-order component for WebGL feature gating
export function withWebGLFallback<P extends object>(
  Component3D: React.ComponentType<P>,
  Component2D: React.ComponentType<P>,
  minPerformance: 'low' | 'medium' | 'high' = 'low'
) {
  return function WebGLWrapper(props: P) {
    const capabilities = useWebGLCapabilities();
    
    if (!capabilities) {
      return <div>Loading...</div>;
    }
    
    const meetsRequirements = capabilities.recommend3D && 
      (minPerformance === 'low' || 
       (minPerformance === 'medium' && capabilities.performance !== 'low') ||
       (minPerformance === 'high' && capabilities.performance === 'high'));
    
    return meetsRequirements ? <Component3D {...props} /> : <Component2D {...props} />;
  };
}