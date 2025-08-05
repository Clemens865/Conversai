'use client'

import { useRef, useEffect, useState } from 'react'

interface Particle {
  position: [number, number, number]
  velocity: [number, number, number]
  life: number
  maxLife: number
  size: number
  color: [number, number, number, number]
}

interface WebGLParticleSystemProps {
  isActive: boolean
  intensity: number
  audioData?: number[]
  className?: string
}

export default function WebGLParticleSystem({ 
  isActive, 
  intensity, 
  audioData = [],
  className = ''
}: WebGLParticleSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)
  const timeRef = useRef(0)

  const [isWebGLSupported, setIsWebGLSupported] = useState(true)

  // Vertex shader source
  const vertexShaderSource = `
    attribute vec3 a_position;
    attribute float a_size;
    attribute vec4 a_color;
    
    uniform mat4 u_matrix;
    uniform float u_time;
    
    varying vec4 v_color;
    varying float v_life;
    
    void main() {
      // Add some wave motion based on time
      vec3 pos = a_position;
      pos.x += sin(u_time * 0.01 + a_position.y * 0.1) * 0.1;
      pos.y += cos(u_time * 0.008 + a_position.x * 0.1) * 0.05;
      
      gl_Position = u_matrix * vec4(pos, 1.0);
      gl_PointSize = a_size * (1.0 + sin(u_time * 0.02) * 0.2);
      
      v_color = a_color;
      v_life = a_color.a;
    }
  `

  // Fragment shader source
  const fragmentShaderSource = `
    precision mediump float;
    
    uniform float u_time;
    varying vec4 v_color;
    varying float v_life;
    
    void main() {
      // Create circular particles
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      
      if (dist > 0.5) {
        discard;
      }
      
      // Add glow effect
      float glow = 1.0 - (dist * 2.0);
      glow = pow(glow, 2.0);
      
      // Pulse effect based on time
      float pulse = 0.8 + 0.2 * sin(u_time * 0.05);
      
      // Energy effect
      float energy = 1.0 - smoothstep(0.0, 0.5, dist);
      energy *= pulse;
      
      vec4 color = v_color;
      color.a *= glow * energy * v_life;
      
      gl_FragColor = color;
    }
  `

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        setIsWebGLSupported(false)
        return
      }

      glRef.current = gl as WebGLRenderingContext

      // Create shaders
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

      if (!vertexShader || !fragmentShader) {
        setIsWebGLSupported(false)
        return
      }

      // Create program
      const program = createProgram(gl, vertexShader, fragmentShader)
      if (!program) {
        setIsWebGLSupported(false)
        return
      }

      programRef.current = program

      // Set up WebGL state
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.clearColor(0, 0, 0, 0)

      // Initialize particles
      initializeParticles()

      // Start animation
      animate()

    } catch (error) {
      console.error('WebGL initialization failed:', error)
      setIsWebGLSupported(false)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type)
    if (!shader) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
    const program = gl.createProgram()
    if (!program) return null

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      return null
    }

    return program
  }

  const initializeParticles = () => {
    particlesRef.current = []
    
    // Create initial particles
    for (let i = 0; i < 200; i++) {
      addParticle()
    }
  }

  const addParticle = () => {
    const particle: Particle = {
      position: [
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5
      ],
      velocity: [
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.01
      ],
      life: 1.0,
      maxLife: 60 + Math.random() * 120,
      size: 3 + Math.random() * 7,
      color: [
        0.9 + Math.random() * 0.1,  // Red
        0.2 + Math.random() * 0.6,  // Green  
        0.1 + Math.random() * 0.3,  // Blue
        1.0                         // Alpha
      ]
    }
    particlesRef.current.push(particle)
  }

  const updateParticles = () => {
    const particles = particlesRef.current

    // Update existing particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i]
      
      // Update position
      particle.position[0] += particle.velocity[0]
      particle.position[1] += particle.velocity[1]
      particle.position[2] += particle.velocity[2]
      
      // Update life
      particle.life -= 1 / particle.maxLife
      particle.color[3] = particle.life
      
      // Add some drift
      particle.velocity[1] += 0.0001 // slight upward drift
      
      // Audio reactive behavior
      if (audioData.length > 0) {
        const audioIndex = Math.floor((i / particles.length) * audioData.length)
        const audioLevel = audioData[audioIndex] || 0
        particle.velocity[0] += (Math.random() - 0.5) * audioLevel * 0.001
        particle.velocity[1] += audioLevel * 0.0005
        particle.size = (3 + Math.random() * 7) * (1 + audioLevel * 0.5)
      }
      
      // Remove dead particles
      if (particle.life <= 0) {
        particles.splice(i, 1)
      }
    }

    // Add new particles if system is active
    if (isActive && particles.length < 300) {
      const particlesToAdd = Math.floor(intensity * 5)
      for (let i = 0; i < particlesToAdd; i++) {
        addParticle()
      }
    }
  }

  const render = () => {
    const gl = glRef.current
    const program = programRef.current
    if (!gl || !program || !isWebGLSupported) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Resize canvas if needed
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)

    const particles = particlesRef.current
    if (particles.length === 0) return

    // Prepare data arrays
    const positions: number[] = []
    const sizes: number[] = []
    const colors: number[] = []

    particles.forEach(particle => {
      positions.push(...particle.position)
      sizes.push(particle.size)
      colors.push(...particle.color)
    })

    // Create and bind buffers
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW)

    const a_position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(a_position)
    gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0)

    const sizeBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW)

    const a_size = gl.getAttribLocation(program, 'a_size')
    gl.enableVertexAttribArray(a_size)
    gl.vertexAttribPointer(a_size, 1, gl.FLOAT, false, 0, 0)

    const colorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW)

    const a_color = gl.getAttribLocation(program, 'a_color')
    gl.enableVertexAttribArray(a_color)
    gl.vertexAttribPointer(a_color, 4, gl.FLOAT, false, 0, 0)

    // Set uniforms
    const u_matrix = gl.getUniformLocation(program, 'u_matrix')
    const matrix = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]
    gl.uniformMatrix4fv(u_matrix, false, matrix)

    const u_time = gl.getUniformLocation(program, 'u_time')
    gl.uniform1f(u_time, timeRef.current)

    // Draw particles
    gl.drawArrays(gl.POINTS, 0, particles.length)

    // Clean up buffers
    gl.deleteBuffer(positionBuffer)
    gl.deleteBuffer(sizeBuffer)
    gl.deleteBuffer(colorBuffer)
  }

  const animate = () => {
    timeRef.current += 1
    updateParticles()
    render()
    animationRef.current = requestAnimationFrame(animate)
  }

  // Fallback Canvas 2D rendering for unsupported devices
  const Canvas2DFallback = () => {
    const canvas2DRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
      const canvas = canvas2DRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      let particles: Array<{
        x: number
        y: number
        vx: number
        vy: number
        life: number
        maxLife: number
        size: number
        hue: number
      }> = []

      const addParticle = () => {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          maxLife: 60 + Math.random() * 60,
          size: 2 + Math.random() * 4,
          hue: Math.random() * 60 // Red to orange range
        })
      }

      const animate2D = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          
          p.x += p.vx
          p.y += p.vy
          p.life -= 1 / p.maxLife
          
          if (p.life <= 0) {
            particles.splice(i, 1)
            continue
          }

          ctx.save()
          ctx.globalAlpha = p.life
          ctx.fillStyle = `hsl(${p.hue}, 100%, 50%)`
          ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Add new particles
        if (isActive && particles.length < 50) {
          for (let i = 0; i < Math.floor(intensity * 3); i++) {
            addParticle()
          }
        }

        requestAnimationFrame(animate2D)
      }

      animate2D()
    }, [isActive, intensity])

    return (
      <canvas
        ref={canvas2DRef}
        className={className}
        width={800}
        height={600}
        style={{ width: '100%', height: '100%' }}
      />
    )
  }

  if (!isWebGLSupported) {
    return <Canvas2DFallback />
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={800}
      height={600}
      style={{ width: '100%', height: '100%' }}
    />
  )
}