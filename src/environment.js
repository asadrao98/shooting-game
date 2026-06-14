import * as THREE from 'three';
import { SKY_PRESETS, streakTexture, flakeTexture, dustTexture } from './textures.js';
import { ParticleField } from './particles.js';

export const ENV_PRESETS = {
  clearNoon: {
    label: 'Clear Noon',
    sky: 'clearNoon',
    sun: { pos: [32, 60, 24], color: 0xfff4e0, intensity: 2.2 },
    hemi: { sky: 0xbfd6ec, ground: 0x8a7960, intensity: 0.85 },
    fill: { color: 0x90b4dc, intensity: 0.4, pos: [-20, 30, -15] },
    fog: { color: 0xc8dcec, near: 60, far: 180 },
    exposure: 1.05,
    weather: null,
  },
  cloudyAfternoon: {
    label: 'Cloudy Afternoon',
    sky: 'cloudyAfternoon',
    sun: { pos: [25, 55, 20], color: 0xc8d0dc, intensity: 1.2 },
    hemi: { sky: 0xa6b0ba, ground: 0x6a6258, intensity: 0.95 },
    fill: { color: 0x8090a0, intensity: 0.35, pos: [-20, 30, -15] },
    fog: { color: 0xa6acb4, near: 45, far: 140 },
    exposure: 0.95,
    weather: null,
  },
  sunset: {
    label: 'Sunset',
    sky: 'sunset',
    sun: { pos: [40, 14, 8], color: 0xff8c40, intensity: 1.9 },
    hemi: { sky: 0xee7a44, ground: 0x382014, intensity: 0.55 },
    fill: { color: 0x6a3a5c, intensity: 0.3, pos: [-20, 18, -15] },
    fog: { color: 0xa8623c, near: 35, far: 130 },
    exposure: 1.02,
    weather: null,
  },
  foggyMorning: {
    label: 'Foggy Morning',
    sky: 'foggyMorning',
    sun: { pos: [22, 30, 18], color: 0xeae0d0, intensity: 0.85 },
    hemi: { sky: 0xc4c8cc, ground: 0x807868, intensity: 0.8 },
    fill: { color: 0xa8b0b8, intensity: 0.3, pos: [-20, 30, -15] },
    fog: { color: 0xbcc0c4, near: 6, far: 32 },
    exposure: 0.95,
    weather: { fog: true },
  },
  snowyDay: {
    label: 'Snowy Day',
    sky: 'snowyDay',
    sun: { pos: [25, 50, 18], color: 0xe8eef4, intensity: 1.15 },
    hemi: { sky: 0xc4d4e2, ground: 0xc8d4dc, intensity: 1.05 },
    fill: { color: 0xa0b0c0, intensity: 0.35, pos: [-15, 25, -10] },
    fog: { color: 0xc8d2dc, near: 28, far: 100 },
    exposure: 1.02,
    weather: { snow: true },
  },
};

export class Environment {
  constructor(scene, renderer, audio) {
    this.scene = scene;
    this.renderer = renderer;
    this.audio = audio;
    this.lights = [];
    this.particles = [];
    this.preset = null;
    this.lightning = null;
    this.flashEl = document.getElementById('flash');
  }

  apply(presetKey) {
    this.dispose();
    const p = ENV_PRESETS[presetKey];
    if (!p) return;
    this.preset = p;

    this.scene.background = SKY_PRESETS[p.sky]();
    this.scene.fog = new THREE.Fog(p.fog.color, p.fog.near, p.fog.far);
    this.renderer.toneMappingExposure = p.exposure ?? 1.0;

    const hemi = new THREE.HemisphereLight(p.hemi.sky, p.hemi.ground, p.hemi.intensity);
    this.scene.add(hemi);
    this.lights.push(hemi);

    const sun = new THREE.DirectionalLight(p.sun.color, p.sun.intensity);
    sun.position.set(...p.sun.pos);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 160;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    this.lights.push(sun);
    this.sun = sun;

    if (p.fill) {
      const fill = new THREE.DirectionalLight(p.fill.color, p.fill.intensity);
      fill.position.set(...p.fill.pos);
      this.scene.add(fill);
      this.lights.push(fill);
    }

    const w = p.weather;
    if (w) {
      if (w.snow) {
        this.particles.push(new ParticleField(this.scene, {
          count: 2200,
          area: { x: 70, y: 28, z: 70 },
          speed: 1.6,
          color: 0xffffff,
          size: 0.16,
          opacity: 0.9,
          texture: flakeTexture(),
          sway: 1.0,
          fall: 'drift',
        }));
      }
      if (w.fog) {
        this.particles.push(new ParticleField(this.scene, {
          count: 700,
          area: { x: 60, y: 8, z: 60 },
          speed: 0.15,
          color: 0xd8dce0,
          size: 1.2,
          opacity: 0.18,
          texture: dustTexture(),
          additive: false,
          sway: 0.3,
          fall: 'drift',
        }));
      }
    }
  }

  update(dt, playerPos) {
    for (const f of this.particles) {
      f.follow(playerPos);
      f.update(dt);
    }
  }

  dispose() {
    this.lights.forEach(l => this.scene.remove(l));
    this.lights = [];
    this.sun = null;
    this.particles.forEach(p => p.dispose());
    this.particles = [];
    this.lightning = null;
    if (this.audio) this.audio.stopAmbient();
  }
}
