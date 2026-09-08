"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface PipelineFieldProps {
  weights?: number[];
  className?: string;
  style?: React.CSSProperties;
}

export function PipelineField({ weights, className = "", style }: PipelineFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number | null = null;
    let isDisposed = false;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    const SPAN_X = 15;      // world-space width particles travel across
    const BAND_Y = 3.6;     // vertical band thickness
    const CLUSTER_T = 0.56; // progress (0..1) where the cluster core sits
    const CLUSTER_W = 0.16; // width of the cluster pull zone

    const COUNT = reduceMotion ? 0 : 2200;

    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);

    // Simulation state
    const t = new Float32Array(COUNT);
    const speed = new Float32Array(COUNT);
    const lane = new Float32Array(COUNT);
    const seed = new Float32Array(COUNT);
    const survives = new Uint8Array(COUNT);
    const sourceColors: THREE.Color[] = [];

    const palette = [
      new THREE.Color("#ff8a4d"), // HN
      new THREE.Color("#7c5cff"), // GH
      new THREE.Color("#4dd9e8"), // SE
      new THREE.Color("#5fe0a0"), // DEV
      new THREE.Color("#e05fd0"), // LOB
    ];

    const sourceWeights = weights && weights.length === 5 ? weights : [126, 77, 117, 35, 15];
    const totalW = sourceWeights.reduce((a, b) => a + (b > 0 ? b : 1), 0);

    const white = new THREE.Color("#ffffff");

    for (let i = 0; i < COUNT; i++) {
      t[i] = Math.random();
      speed[i] = 0.045 + Math.random() * 0.05;
      lane[i] = Math.random() * 2 - 1;
      seed[i] = Math.random() * 1000;
      survives[i] = Math.random() < 0.14 ? 1 : 0;

      let r = Math.random() * totalW;
      let idx = 0;
      for (let w = 0; w < sourceWeights.length; w++) {
        const wt = sourceWeights[w] > 0 ? sourceWeights[w] : 1;
        if (r < wt) {
          idx = w;
          break;
        }
        r -= wt;
      }
      const c = palette[idx] || palette[0];
      sourceColors.push(c);

      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = survives[i] ? 0.8 + Math.random() * 0.55 : 0.34 + Math.random() * 0.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const pixelRatio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: pixelRatio } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main(){
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (130.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if(d > 0.5) discard;
          float glow = pow(smoothstep(0.5, 0.0, d), 2.2);
          gl_FragColor = vec4(vColor, glow * 0.65);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const mouse = new THREE.Vector2(0, 0);
    const mouseTarget = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();

    function resize() {
      if (!canvas || isDisposed) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }

    function onPointer(e: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseTarget.set(x * (SPAN_X * 0.5), y * BAND_Y);
    }

    if (reduceMotion) {
      // Reduced motion: static initial render, no animation loop
      resize();
      renderer.render(scene, camera);
      return () => {
        isDisposed = true;
        renderer.dispose();
        geo.dispose();
        mat.dispose();
      };
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer);
    resize();

    function tick() {
      if (isDisposed) return;
      animId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      // Ease mouse toward target
      mouse.x += (mouseTarget.x - mouse.x) * 0.06;
      mouse.y += (mouseTarget.y - mouse.y) * 0.06;

      const pos = geo.attributes.position.array as Float32Array;
      const col = geo.attributes.color.array as Float32Array;
      const SPAN = SPAN_X;

      for (let i = 0; i < COUNT; i++) {
        let curT = t[i] + dt * speed[i];
        if (curT > 1) curT -= 1;
        t[i] = curT;

        let x = -SPAN * 0.5 + curT * SPAN;
        let y = lane[i] * BAND_Y * 0.5;

        // Organic wobble
        const s = seed[i];
        y += Math.sin(elapsed * 0.6 + s) * 0.18 + Math.sin(elapsed * 0.23 + s * 1.7) * 0.12;
        let z = Math.cos(elapsed * 0.4 + s * 0.5) * 0.6;

        // Cluster pull
        const dCluster = (curT - CLUSTER_T) / CLUSTER_W;
        const pull = Math.exp(-dCluster * dCluster);
        const angle = elapsed * 1.6 + s;
        x += Math.cos(angle) * pull * 0.7;
        y = y * (1 - pull * 0.85) + Math.sin(angle) * pull * 0.9;
        z += Math.sin(angle * 1.3) * pull * 0.8;

        // Past cluster
        let brightness = 1.0;
        let colorMix = 0.0;
        if (curT > CLUSTER_T) {
          const past = (curT - CLUSTER_T) / (1 - CLUSTER_T);
          if (survives[i]) {
            y += past * 1.4;
            colorMix = Math.min(past * 2.2, 1);
            brightness = 1.0;
          } else {
            brightness = Math.max(0, 1 - past * 1.8);
          }
        }

        // Spawn fade in
        if (curT < 0.06) brightness *= curT / 0.06;

        // Cursor repulsion
        const mdx = x - mouse.x;
        const mdy = y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        const RADIUS = 2.1;
        if (mdist < RADIUS) {
          const force = (1 - mdist / RADIUS) * 1.1;
          const inv = 1 / (mdist + 0.0001);
          x += mdx * inv * force;
          y += mdy * inv * force;
        }

        pos[i * 3 + 0] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;

        const base = sourceColors[i];
        const r = base.r + (white.r - base.r) * colorMix;
        const g = base.g + (white.g - base.g) * colorMix;
        const b = base.b + (white.b - base.b) * colorMix;
        col[i * 3 + 0] = r * brightness;
        col[i * 3 + 1] = g * brightness;
        col[i * 3 + 2] = b * brightness;
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      // Gentle camera parallax toward cursor
      camera.position.x += (mouse.x * 0.12 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * 0.12 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    tick();

    return () => {
      isDisposed = true;
      if (animId !== null) cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, [weights]);

  return (
    <canvas
      ref={canvasRef}
      className={`hero-pipeline-canvas ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export default PipelineField;
