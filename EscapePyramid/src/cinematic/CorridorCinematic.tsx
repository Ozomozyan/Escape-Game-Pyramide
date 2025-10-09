// src/cinematic/CorridorCinematic.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useRoom } from "../state/RoomProvider";

type Torch = {
  light: THREE.PointLight;
  flame: THREE.Mesh;
  support: THREE.Mesh;
  phase: number;
  speed: number;
  baseY: number;
};

export default function CorridorCinematic({ onDone }: { onDone: () => void }) {
  const { roomCode, air, meta } = useRoom();

  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rafRef = useRef<number | null>(null);
  const torchesRef = useRef<Torch[]>([]);

  const [moving, setMoving] = useState(false);

  // Air percentage for bar
  const airPct = useMemo(() => {
    const total = meta?.air_initial ?? 1200;
    return Math.max(0, Math.min(100, Math.round(((air ?? total) / total) * 100)));
  }, [air, meta?.air_initial]);

  const formatAir = (s: number | undefined) => {
    const secs = Math.max(0, Math.floor(s ?? 0));
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const sc = (secs % 60).toString().padStart(2, "0");
    return `${m}:${sc}`;
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene / Camera / Renderer
    const scene = new THREE.Scene();
    // Softer fog so columns are clearly visible
    scene.fog = new THREE.FogExp2(0x1a0f0a, 0.009);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      80,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2.5, 0);
    camera.lookAt(0, 2.5, -20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x0a0604);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Procedural textures (no external assets)
    const makeStone = () => {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#8b7355";
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 4 + 1;
        const b = Math.random() * 60 - 30;
        ctx.fillStyle = `rgb(${139 + b},${115 + b},${85 + b})`;
        ctx.fillRect(x, y, s, s);
      }
      ctx.strokeStyle = "#4a3a2a";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 512, i * 64);
        ctx.lineTo(Math.random() * 512, (i + 1) * 64);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i * 64, Math.random() * 512);
        ctx.lineTo((i + 1) * 64, Math.random() * 512);
        ctx.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    };

    const makeSand = () => {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#6b5744";
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 2;
        const b = Math.random() * 40 - 20;
        ctx.fillStyle = `rgb(${107 + b},${87 + b},${68 + b})`;
        ctx.fillRect(x, y, s, s);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    };

    const makeNormal = () => {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#8080ff";
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 8 + 2;
        const g = ctx.createRadialGradient(x, y, 0, x, y, s);
        g.addColorStop(0, "#9090ff");
        g.addColorStop(1, "#7070ff");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    };

    const wallTex = makeStone();
    const floorTex = makeSand();
    const normTex = makeNormal();

    // --- Corridor geometry
    const floorGeo = new THREE.PlaneGeometry(10, 100);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      normalMap: normTex.clone(),
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(0.8, 0.8)
    });
    floorTex.repeat.set(3, 30);
    (floorMat.normalMap as THREE.Texture).repeat.set(3, 30);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -50);
    scene.add(floor);

    const ceilingMat = new THREE.MeshStandardMaterial({
      map: wallTex.clone(),
      normalMap: normTex.clone(),
      roughness: 1,
      metalness: 0,
      color: 0x4a3a2a
    });
    (ceilingMat.map as THREE.Texture).repeat.set(3, 30);
    (ceilingMat.normalMap as THREE.Texture).repeat.set(3, 30);
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 6, -50);
    scene.add(ceiling);

    const wallGeo = new THREE.PlaneGeometry(100, 6);
    wallTex.repeat.set(30, 2);
    normTex.repeat.set(30, 2);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      normalMap: normTex,
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(1.4, 1.4)
    });

    const left = new THREE.Mesh(wallGeo, wallMat);
    left.rotation.y = Math.PI / 2;
    left.position.set(-5, 3, -50);
    scene.add(left);

    const right = new THREE.Mesh(wallGeo, wallMat.clone());
    right.rotation.y = -Math.PI / 2;
    right.position.set(5, 3, -50);
    scene.add(right);

    const backGeo = new THREE.PlaneGeometry(10, 6);
    const back = new THREE.Mesh(backGeo, wallMat.clone());
    back.position.set(0, 3, -100);
    scene.add(back);

    // --- Engaged wall columns (very visible)
    const addEngagedColumns = () => {
      const shaftGeo = new THREE.CylinderGeometry(0.55, 0.6, 6, 16);
      const capGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.6, 16);
      const baseGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xd2b48c,
        roughness: 0.6,
        metalness: 0.15
      });

      const zs = [-10, -25, -40, -55, -70, -85];
      zs.forEach((z) => {
        [-4.2, 4.2].forEach((x) => {
          const shaft = new THREE.Mesh(shaftGeo, mat);
          shaft.position.set(x, 3, z);
          scene.add(shaft);

          const cap = new THREE.Mesh(capGeo, mat);
          cap.position.set(x, 6.3, z);
          scene.add(cap);

          const base = new THREE.Mesh(baseGeo, mat);
          base.position.set(x, 0.2, z);
          scene.add(base);
        });
      });
    };
    addEngagedColumns();

    // (Optional) freestanding pillars for depth accents
    const colGeo = new THREE.CylinderGeometry(0.4, 0.5, 6, 12);
    const colMat = new THREE.MeshStandardMaterial({ color: 0xc9a961, roughness: 0.7, metalness: 0.2 });
    [-20, -60].forEach((z) => {
      [-4, 4].forEach((x) => {
        const p = new THREE.Mesh(colGeo, colMat);
        p.position.set(x, 3, z);
        scene.add(p);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.4, 0.5, 12), colMat);
        cap.position.set(x, 6.2, z);
        scene.add(cap);
      });
    });

    // --- Lighting
    scene.add(new THREE.AmbientLight(0x3a2a1a, 0.42));
    scene.add(new THREE.HemisphereLight(0x9b7b5a, 0x0a0604, 0.25));
    const torchPositions = [-10, -30, -50, -70, -90];
    torchPositions.forEach((z, i) => {
      [-4.5, 4.5].forEach((x) => {
        const support = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.12, 1.2, 8),
          new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9, metalness: 0.1 })
        );
        support.position.set(x, 4.5, z);
        scene.add(support);

        const light = new THREE.PointLight(0xff5500, 3.6, 22, 1.8);
        light.position.set(x, 5.2, z);
        scene.add(light);

        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 })
        );
        flame.position.copy(light.position);
        scene.add(flame);

        torchesRef.current.push({
          light,
          flame,
          support,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.6,
          baseY: light.position.y
        });
      });
    });

    // --- Resize
    const onResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // --- Animate
    const animate = () => {
      const t = performance.now() * 0.001;

      // Torch flicker
      torchesRef.current.forEach((tch, idx) => {
        tch.phase += tch.speed * 0.016;
        const f1 = Math.sin(tch.phase * 3) * 0.15;
        const f2 = Math.sin(tch.phase * 7) * 0.08;
        const f3 = Math.sin(tch.phase * 13) * 0.05;
        const flick = 1 + f1 + f2 + f3;
        tch.light.intensity = 3.6 * flick;
        tch.light.position.y = tch.baseY + Math.sin(tch.phase * 2) * 0.1;
        tch.flame.scale.setScalar(0.7 + flick * 0.4);
        tch.flame.position.y = tch.light.position.y;
        tch.support.rotation.z = Math.sin(t + idx) * 0.05;
      });

      // Idle breathing
      if (!moving && cameraRef.current) {
        cameraRef.current.position.y = 2.5 + Math.sin(t * 0.5) * 0.05;
        cameraRef.current.rotation.z = Math.sin(t * 0.3) * 0.002;
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    // --- Cleanup
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      torchesRef.current = [];
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.domElement?.parentElement?.removeChild(rendererRef.current.domElement);
      }
      scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose?.();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
          else mat?.dispose?.();
        }
      });
      scene.clear();
    };
  }, []);

  // Move forward then go to the first puzzle via callback
  const begin = () => {
    if (moving) return;
    setMoving(true);

    const camera = cameraRef.current!;
    const startZ = camera.position.z;
    const targetZ = startZ - 40; // how far to move
    const duration = 3500; // ms
    const start = performance.now();

    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p; // easeInOutQuad
      camera.position.z = startZ + (targetZ - startZ) * ease;
      camera.lookAt(0, 2.5, camera.position.z - 20);
      camera.position.x = Math.sin(p * Math.PI * 8) * 0.03;
      camera.position.y = 2.5 + Math.sin(p * Math.PI * 12) * 0.04;
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        setTimeout(() => onDone(), 900); // go to your first puzzle
      }
    };
    requestAnimationFrame(step);
  };

  return (
    <div className="relative h-[calc(100vh-2rem)] max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden shadow-2xl">
      {/* Three.js mount */}
      <div ref={mountRef} className="absolute inset-0" />
      {/* Vignette */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* HUD */}
      <div className="absolute top-4 left-4 z-10 text-white">
        <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur px-4 py-3 min-w-[260px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-amber-300 font-semibold tracking-wide text-sm">⟨ 𓂀 MA’AT ⟩</div>
              <div className="mt-1 text-xs opacity-80">
                Room: <span className="font-mono">{roomCode}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase opacity-70 leading-none">Air</div>
              <div className="text-lg font-mono leading-none">
                {formatAir(air ?? meta?.air_initial ?? 0)}
              </div>
            </div>
          </div>
          <div className="mt-2 h-3 rounded bg-white/10 overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${airPct}%`,
                background: "linear-gradient(90deg,#4a9eff,#1e5a9e,#4a9eff)"
              }}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        <button
          onClick={begin}
          disabled={moving}
          className="px-5 py-3 rounded-lg font-semibold text-black bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-200 shadow-lg hover:scale-[1.03] active:scale-[0.99] transition disabled:opacity-50"
        >
          {moving ? "…" : "⚡ Advance into the pyramid"}
        </button>
        <button
          onClick={() => onDone()}
          className="px-4 py-3 rounded-lg text-white bg-black/60 border border-white/10 hover:bg-black/70"
        >
          Skip
        </button>
      </div>

      {/* Accessibility */}
      <span className="sr-only">
        A dim sandstone corridor with engaged columns and flickering torches; the camera moves forward.
      </span>
    </div>
  );
}
