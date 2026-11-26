/* Moteur 3D Three.js, indépendant de l'interface.
   Rendu physique, ciel, ombres douces, lumière pré-calculée par sommet, occlusion d'écran, halo des lumières.
   L'interface le pilote par l'API Engine (vue maquette ou visite, étage, zoom, focus sur une pièce). */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Gabarit } from '../data/types';
import { BATCH_ORDER, buildScene, type BatchKey } from '../geo/build';
import type { DiagStats } from '../diag';
import { HEAD, PATTERN, ROUGH } from './shaders';
import { freeSpotNear, houseBox, makeHit, walkBounds } from './walk';

export type ViewMode = 'orbit' | 'walk';
export interface Engine {
  show(mode: ViewMode): void;
  hide(): void;
  setRoof(on: boolean): void;
  reset(): void;
  zoom(f: number): void;
  focus(roomId: string): void;
  /** joystick tactile : x à droite, y vers le bas, entre -1 et 1 */
  setJoy(x: number, y: number): void;
  stats(): DiagStats;
  dispose(): void;
}
export interface EngineOptions { bakeUrl: string; mobile: boolean; onError?: (m: string) => void }

interface OrbitState { yaw: number; pitch: number; dist: number; t: [number, number, number] }

export function createEngine(cv: HTMLCanvasElement, G: Gabarit, opts: EngineOptions): Engine {
  const MOBILE = opts.mobile, err = opts.onError ?? (() => {});
  const FL = G.heights.floor;
  const SC = buildScene(G), BATCH = SC.BATCH;
  const hit = makeHit(SC.COLL, walkBounds(G)), HB = houseBox(G);

  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .62;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const SUN = new THREE.Vector3(-.6, .52, .6).normalize(), CTR = new THREE.Vector3(11, 0, 15.4);
  /* ciel physique + environnement pour les reflets */
  const sky = new Sky(); sky.scale.setScalar(4000);
  const su = sky.material.uniforms;
  su.turbidity.value = 5.5; su.rayleigh.value = 1.4; su.mieCoefficient.value = .004; su.mieDirectionalG.value = .86; su.sunPosition.value.copy(SUN).multiplyScalar(1000);
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(4000);
  sky2.material.uniforms.sunPosition.value.copy(SUN).multiplyScalar(1000);
  for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) sky2.material.uniforms[k].value = su[k].value;
  envScene.add(sky2); const envRT = pmrem.fromScene(envScene); scene.environment = envRT.texture;
  scene.fog = new THREE.Fog(0xcdb79a, 70, 320);
  /* soleil */
  const sun = new THREE.DirectionalLight(new THREE.Color(1, .82, .62), 3.2 * Math.PI);
  sun.position.copy(CTR).addScaledVector(SUN, 60); sun.target.position.copy(CTR);
  sun.castShadow = true; sun.shadow.mapSize.set(MOBILE ? 2048 : 4096, MOBILE ? 2048 : 4096);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 130 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -.0002; sun.shadow.normalBias = .025; sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  /* ---------- matériaux : motifs procéduraux + lumière pré-calculée ---------- */
  const U = { uT: { value: 0 }, uRoof: { value: 0 } };
  function patch(mat: THREE.MeshStandardMaterial, water = false) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = U.uT; sh.uniforms.uRoof = U.uRoof;
      sh.vertexShader = 'attribute float aMat;attribute vec3 aB0;attribute vec3 aB1;uniform float uRoof;varying vec3 vWPos;varying vec3 vWNrm;varying vec3 vBk;varying float vMat;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWPos=position;vWNrm=normal;vMat=aMat;vec3 bb=uRoof>.5?aB1:aB0;vBk=bb*bb*4.;');
      let f = HEAD + sh.fragmentShader;
      f = f.replace('#include <color_fragment>', '#include <color_fragment>\n' + (water ? '' : PATTERN));
      f = f.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + (water ? '' : ROUGH));
      if (water) f = f.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal=normalize(normal+(viewMatrix*vec4(.045*sin(vWPos.x*4.+uT*1.3)+.02*sin(vWPos.z*7.+uT*2.),0.,.045*sin(vWPos.z*3.3-uT)+.02*sin(vWPos.x*6.-uT*1.7),0.)).xyz);');
      f = f.replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n iblIrradiance=vBk*PI;irradiance=vec3(0.);\n#if defined( RE_IndirectSpecular )\n radiance*=clamp(dot(vBk,vec3(.333))/.35,.12,1.);\n#endif');
      f = f.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n if(vMat>7.5&&vMat<8.5)totalEmissiveRadiance=diffuseColor.rgb*6.;');
      sh.fragmentShader = f;
    };
    mat.customProgramCacheKey = () => water ? 'villa-water' : 'villa';
    return mat;
  }
  const MAT = {
    opaque: patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0 })),
    glass: patch(new THREE.MeshStandardMaterial({ color: new THREE.Color(.04, .06, .07), roughness: .03, metalness: 0, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 })),
    water: patch(new THREE.MeshStandardMaterial({ color: new THREE.Color(.006, .17, .25), roughness: .04, metalness: 0, transparent: true, opacity: .55, depthWrite: false, envMapIntensity: 1.2 }), true),
  };
  MAT.glass.customProgramCacheKey = () => 'villa-glass';

  /* ---------- géométries ---------- */
  const B0 = Math.round(Math.sqrt(.4 / 4) * 255), MESH: Partial<Record<BatchKey, THREE.Mesh>> = {}, IB: Partial<Record<BatchKey, THREE.InterleavedBuffer>> = {};
  const lin = (v: number) => Math.pow(v, 2.2);
  for (const k of BATCH_ORDER) {
    const b = BATCH[k]; if (!b) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    const c = new Float32Array(b.c.length); for (let i = 0; i < c.length; i++) c[i] = lin(b.c[i]); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(b.m, 1));
    const ib = new THREE.InterleavedBuffer(new Uint8Array(b.nv * 6).fill(B0), 6); IB[k] = ib;
    g.setAttribute('aB0', new THREE.InterleavedBufferAttribute(ib, 3, 0, true)); g.setAttribute('aB1', new THREE.InterleavedBufferAttribute(ib, 3, 3, true));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(b.i), 1)); g.computeBoundingSphere();
    const mat = k === 'glass' || k === 'glassR' ? MAT.glass : k === 'water' ? MAT.water : MAT.opaque;
    const mesh = new THREE.Mesh(g, mat); mesh.matrixAutoUpdate = false;
    if (mat === MAT.opaque) { mesh.castShadow = true; mesh.receiveShadow = true; } else { mesh.renderOrder = k === 'water' ? 1 : 2; mesh.receiveShadow = k === 'water'; }
    scene.add(mesh); MESH[k] = mesh;
  }
  /* lumière pré-calculée : <gabarit>.json (nombre de sommets par calque) + <gabarit>.bin */
  let baked = false;
  Promise.all([fetch(opts.bakeUrl + '.json').then(r => r.json()), fetch(opts.bakeUrl + '.bin').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })])
    .then(([meta, buf]: [{ batches: Record<string, number> }, ArrayBuffer]) => {
      let off = 0; const u8 = new Uint8Array(buf);
      for (const k of BATCH_ORDER) {
        const n = meta.batches[k]; if (!n) continue; const ib = IB[k];
        if (!ib || ib.count !== n) throw new Error('lumière obsolète pour le calque ' + k + ' : relancer npm run bake');
        (ib.array as Uint8Array).set(u8.subarray(off, off + n * 6)); ib.needsUpdate = true; off += n * 6;
      }
      baked = true;
    }).catch(e => err('lumière : ' + e.message));

  /* ---------- caméra et post-traitement ---------- */
  const camera = new THREE.PerspectiveCamera(43, 1, .05, 6000);
  let composer: EffectComposer | null = null, gtao: GTAOPass | null = null;
  try {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
    try {
      gtao = new GTAOPass(scene, camera, 4, 4);
      gtao.updateGtaoMaterial({ radius: .45, distanceExponent: 1.5, thickness: 1, scale: 1 });
      gtao.blendIntensity = .65; composer.addPass(gtao);
    } catch (e) { gtao = null; err('gtao: ' + (e as Error).message); }
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), .22, .45, .92));
    composer.addPass(new OutputPass());
  } catch (e) { composer = null; err('composer: ' + (e as Error).message); }

  const START_FP = { x: 12.6, z: 26.9, yaw: Math.PI, pitch: -.02 };
  const ORB0: OrbitState = { yaw: .55, pitch: .72, dist: 33, t: [10.9, 0, 15.6] };
  const S = {
    mode: 'orbit' as ViewMode, roof: false, orb: structuredClone(ORB0), oc: null as OrbitState | null,
    fp: { ...START_FP }, keys: {} as Record<string, boolean>, joy: [0, 0] as [number, number],
    t0: performance.now(), exp: .62, fps: 0, degraded: '', shown: false,
  };
  let lastRoof: boolean | null = null, W0 = 0, H0 = 0;
  function frame() {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (w !== W0 || h !== H0) { W0 = w; H0 = h; renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } }
    const a = w / Math.max(h, 1); camera.aspect = a;
    if (S.mode === 'orbit') {
      const T = S.orb; if (!S.oc) S.oc = structuredClone(T); const o = S.oc, k = .2;
      o.yaw += (T.yaw - o.yaw) * k; o.pitch += (T.pitch - o.pitch) * k; o.dist += (T.dist - o.dist) * k; for (let i = 0; i < 3; i++) o.t[i] += (T.t[i] - o.t[i]) * k;
      camera.fov = 43;
      camera.position.set(o.t[0] + o.dist * Math.cos(o.pitch) * Math.sin(o.yaw), o.t[1] + o.dist * Math.sin(o.pitch), o.t[2] + o.dist * Math.cos(o.pitch) * Math.cos(o.yaw));
      camera.lookAt(o.t[0], o.t[1], o.t[2]);
    } else {
      const f = S.fp; camera.fov = a < 1 ? 72 : 60; camera.position.set(f.x, FL + 1.62, f.z);
      camera.lookAt(f.x + Math.sin(f.yaw) * Math.cos(f.pitch), FL + 1.62 + Math.sin(f.pitch), f.z + Math.cos(f.yaw) * Math.cos(f.pitch));
    }
    camera.updateProjectionMatrix();
    const roof = S.roof || S.mode === 'walk';
    if (roof !== lastRoof) {
      lastRoof = roof; if (MESH.roof) MESH.roof.visible = roof; if (MESH.glassR) MESH.glassR.visible = roof;
      U.uRoof.value = roof ? 1 : 0; renderer.shadowMap.needsUpdate = true;
    }
    /* exposition : plus claire à l'intérieur de la maison */
    const f = S.fp, inH = S.mode === 'walk' && f.x > HB[0] && f.x < HB[2] && f.z > HB[1] && f.z < HB[3];
    S.exp += ((inH ? 1.0 : .62) - S.exp) * .06; renderer.toneMappingExposure = S.exp;
    U.uT.value = (performance.now() - S.t0) / 1000;
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  /* ---------- déplacement en visite ---------- */
  function step(dt: number) {
    const f = S.fp, k = S.keys;
    let fw = (k.f ? 1 : 0) - (k.b ? 1 : 0) + (-S.joy[1]), st = (k.r ? 1 : 0) - (k.l ? 1 : 0) + S.joy[0];
    f.yaw += ((k.tl ? 1 : 0) - (k.tr ? 1 : 0)) * dt * 1.8;
    if (!fw && !st) return;
    const L = Math.hypot(fw, st); if (L > 1) { fw /= L; st /= L; }
    const sp = (k.run ? 3.2 : 1.6) * dt, sy = Math.sin(f.yaw), cy = Math.cos(f.yaw), dx = (sy * fw - cy * st) * sp, dz = (cy * fw + sy * st) * sp;
    if (!hit(f.x + dx, f.z)) f.x += dx; if (!hit(f.x, f.z + dz)) f.z += dz;
  }
  let running = false, last = 0, fpsN = 0, fpsT = 0, raf = 0;
  function loop(t: number) {
    if (!running) return;
    const dt = Math.min((t - (last || t)) / 1000, .05); last = t;
    if (S.mode === 'walk') step(dt);
    try { frame(); } catch (e) { running = false; err('image : ' + (e as Error).message); return; }
    fpsN++; if (!fpsT) fpsT = t;
    if (t - fpsT > 2000) {
      S.fps = Math.round(fpsN * 1000 / (t - fpsT)); fpsN = 0; fpsT = t;
      /* qualité adaptative : si l'appareil peine, on retire d'abord l'occlusion d'écran */
      if (S.fps < 40 && gtao && gtao.enabled) { gtao.enabled = false; S.degraded += 'gtao-off '; err('fps ' + S.fps + ' : occlusion désactivée'); }
    }
    raf = requestAnimationFrame(loop);
  }
  function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(loop); }

  /* ---------- interactions ---------- */
  const ptr = new Map<number, { x: number; y: number }>(); let lastPinch: { d: number; c: number[] } | null = null, drag: { pan: boolean } | null = null;
  const clampDist = (d: number) => Math.min(90, Math.max(4, d));
  function pan(dx: number, dy: number) {
    const o = S.orb, k = o.dist * .0016, cy = Math.cos(o.yaw), sy = Math.sin(o.yaw);
    o.t[0] += (-dx * cy - dy * sy) * k; o.t[2] += (dx * sy - dy * cy) * k;
  }
  const L: [EventTarget, string, EventListener, AddEventListenerOptions?][] = [];
  const on = <E extends Event>(t: EventTarget, n: string, f: (e: E) => void, o?: AddEventListenerOptions) => { t.addEventListener(n, f as EventListener, o); L.push([t, n, f as EventListener, o]); };
  on(cv, 'contextmenu', e => e.preventDefault());
  on<PointerEvent>(cv, 'pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { pan: e.button === 2 || e.shiftKey }; if (ptr.size === 2) lastPinch = null; });
  on<PointerEvent>(cv, 'pointermove', e => {
    const p = ptr.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptr.size === 2) {
      const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y), c = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      if (lastPinch && S.mode === 'orbit') { S.orb.dist = clampDist(S.orb.dist * lastPinch.d / d); pan(c[0] - lastPinch.c[0], c[1] - lastPinch.c[1]); }
      lastPinch = { d, c }; return;
    }
    if (S.mode === 'orbit') { if (drag && drag.pan) pan(dx, dy); else { S.orb.yaw -= dx * .006; S.orb.pitch = Math.min(1.5, Math.max(.08, S.orb.pitch + dy * .005)); } }
    else { S.fp.yaw -= dx * .004; S.fp.pitch = Math.min(1.1, Math.max(-1.1, S.fp.pitch + dy * .003)); }
  });
  const pend = (e: PointerEvent) => { ptr.delete(e.pointerId); if (ptr.size < 2) lastPinch = null; if (!ptr.size) drag = null; };
  on(cv, 'pointerup', pend); on(cv, 'pointercancel', pend);
  on<WheelEvent>(cv, 'wheel', e => { e.preventDefault(); if (S.mode === 'orbit') S.orb.dist = clampDist(S.orb.dist * Math.exp(e.deltaY * .0012)); }, { passive: false });
  const KM: Record<string, string> = { z: 'f', w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', q: 'l', a: 'l', d: 'r', arrowleft: 'tl', arrowright: 'tr', shift: 'run' };
  on<KeyboardEvent>(window, 'keydown', e => { if (S.mode !== 'walk' || !running) return; const k = KM[e.key.toLowerCase()]; if (k) { S.keys[k] = true; e.preventDefault(); } });
  on<KeyboardEvent>(window, 'keyup', e => { const k = KM[e.key.toLowerCase()]; if (k) S.keys[k] = false; });
  on(window, 'blur', () => { S.keys = {}; });

  /* compile une première image tout de suite pour détecter une erreur de shader */
  renderer.setSize(Math.max(cv.clientWidth, 2), Math.max(cv.clientHeight, 2), false); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
  for (const p of renderer.info.programs || []) {
    const d = (p as unknown as { diagnostics?: { runnable: boolean; programLog: string; vertexShader: { log: string }; fragmentShader: { log: string } } }).diagnostics;
    if (d && !d.runnable) throw new Error('shader : ' + (d.fragmentShader?.log || d.vertexShader?.log || d.programLog));
  }

  const roomCenter = (id: string) => {
    const r = G.rooms.find(r => r.id === id); if (!r) return null;
    const xs = r.poly.map(p => p[0]), zs = r.poly.map(p => p[1]);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2, w: Math.max(...xs) - Math.min(...xs), d: Math.max(...zs) - Math.min(...zs) };
  };

  return {
    show(mode) {
      S.mode = mode; S.keys = {};
      if (!S.shown) { S.shown = true; if (innerWidth / innerHeight < .8) { S.orb.dist = 52; ORB0.dist = 52; } }
      start();
    },
    hide() { running = false; cancelAnimationFrame(raf); },
    setRoof(on) { S.roof = on; },
    reset() { if (S.mode === 'orbit') S.orb = structuredClone(ORB0); else Object.assign(S.fp, START_FP); },
    zoom(f) { if (S.mode === 'orbit') S.orb.dist = clampDist(S.orb.dist * f); },
    focus(id) {
      const c = roomCenter(id); if (!c) return;
      if (S.mode === 'orbit') { S.orb.t = [c.x, 0, c.z]; S.orb.dist = Math.max(9, Math.min(16, Math.hypot(c.w, c.d) * 2.2)); S.orb.pitch = .85; }
      else { const [x, z] = freeSpotNear(hit, c.x, c.z); S.fp.x = x; S.fp.z = z; }
    },
    setJoy(x, y) { S.joy = [x, y]; },
    stats() {
      let gpu = '';
      try { const g = renderer.getContext(), x = g.getExtension('WEBGL_debug_renderer_info'); gpu = x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)) : ''; } catch { /* rien */ }
      return { engine: 'three r' + THREE.REVISION, mode: S.mode, fps: S.fps, post: !!composer, gtao: !!(gtao && gtao.enabled), degraded: S.degraded, baked,
        w: cv.clientWidth, h: cv.clientHeight, dpr: renderer.getPixelRatio(), gpu };
    },
    dispose() {
      running = false; cancelAnimationFrame(raf);
      for (const [t, n, f, o] of L) t.removeEventListener(n, f, o);
      composer?.dispose(); envRT.dispose(); pmrem.dispose(); renderer.dispose();
    },
  };
}
