import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { World } from './world.js';
import { Player } from './player.js';
import { Weapon } from './weapon.js';
import { Enemy } from './enemy.js';
import { HUD } from './ui.js';
import { LEVELS } from './levels.js';
import { AudioEngine } from './audio.js';
import { Environment } from './environment.js';
import { Grenade } from './effects.js';

export class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc8dcec);
    this.scene.fog = new THREE.Fog(0xc8dcec, 60, 180);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 500);
    this.scene.add(this.camera);

    this.physics = new RAPIER.World({ x: 0, y: -18, z: 0 });
    this.physics.timestep = 1 / 60;

    this.clock = new THREE.Clock();
    this.enemies = [];
    this.enemiesByHandle = new Map();
    this.barrels = [];
    this.barrelsByHandle = new Map();
    this.grenades = [];
    this.paused = false;
    this.hud = new HUD();
    this.audio = new AudioEngine();
    this.environment = new Environment(this.scene, this.renderer, this.audio);
    this.transitioning = false;
    this.shakeIntensity = 0;

    // global stats (persist across stages within a run)
    this.runStats = { kills: 0, headshots: 0, shots: 0, hits: 0, startTime: 0 };
    this.stats = this.runStats; // alias used by weapon

    this.killFeed = [];
    this.settings = this.loadSettings();
    this.applySettings();

    window.addEventListener('resize', () => this.onResize());

    document.addEventListener('pointerlockchange', () => {
      if (window.IS_TOUCH) return;
      if (!document.pointerLockElement) {
        if (this._loop && !this.paused && !this.transitioning && this.player && this.player.hp > 0) {
          this.pause();
        }
      }
    });

    window.addEventListener('keydown', e => {
      if (e.code === 'Escape' && this.paused) this.resumeGame();
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start(difficulty = 'normal', envKey = 'clearNoon') {
    this.audio.resume();
    this.difficulty = difficulty;
    this.envKey = envKey;
    this.lives = 3;
    this.runStats = { kills: 0, headshots: 0, shots: 0, hits: 0, startTime: performance.now() };
    this.stats = this.runStats;
    this.stageStats = { kills: 0, headshots: 0, shots: 0, hits: 0, startTime: performance.now() };
    this.killFeed = [];
    this.environment.apply(envKey);
    this.levelIndex = 0;
    this.loadLevel(this.levelIndex);
    if (!this._loop) {
      this._loop = this.loop.bind(this);
      this.renderer.setAnimationLoop(this._loop);
    } else {
      this.renderer.setAnimationLoop(this._loop);
    }
  }

  loadLevel(idx) {
    if (this.world) this.world.dispose(this.scene, this.physics);
    if (this.player) this.player.dispose(this.scene, this.physics);
    if (this.weapon) this.weapon.dispose();
    this.enemies.forEach(e => e.dispose(this.scene, this.physics));
    this.enemies = [];
    this.enemiesByHandle.clear();
    this.stageStats = { kills: 0, headshots: 0, shots: 0, hits: 0, startTime: performance.now() };
    this.killFeed = [];

    const def = LEVELS[idx];
    this.world = new World(this.scene, this.physics, def);
    this.barrels = this.world.barrels;
    this.barrelsByHandle.clear();
    for (const b of this.barrels) this.barrelsByHandle.set(b.collider.handle, b);
    this.player = new Player(this.scene, this.physics, this.camera, def.spawn);
    this.player.game = this;
    this.weapon = new Weapon(this.camera, this.scene, this.physics, this.player, this);
    this.player.weapon = this.weapon;
    // clean up any in-flight grenades from a previous level
    this.grenades.forEach(g => g.dispose());
    this.grenades = [];

    const diffMult = { easy: 0.7, normal: 1.0, hard: 1.4 }[this.difficulty] || 1;
    def.enemies.forEach(spawn => {
      const e = new Enemy(this.scene, this.physics, spawn, diffMult, this);
      this.enemies.push(e);
      this.enemiesByHandle.set(e.collider.handle, e);
    });

    this.hud.setLevel(`LEVEL ${idx + 1} — ${def.name}`);
  }

  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.paused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.physics.step();

    this.player.update(dt);
    this.weapon.update(dt);
    for (const e of this.enemies) e.update(dt, this.player);
    this.grenades = this.grenades.filter(g => g.update(dt));

    if (this.world && this.world.pickups) {
      for (const p of this.world.pickups) {
        p.update(dt);
        if (p.tryPickup(this.player)) {
          this.weapon.reserve += 60;
          this.audio.playPickup();
          p.dispose();
        }
      }
      this.world.pickups = this.world.pickups.filter(p => !p.taken);
    }
    this.environment.update(dt, this.player.body.translation());

    // screen shake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 4);
      const m = this.shakeIntensity;
      this.camera.position.x += (Math.random() - 0.5) * m;
      this.camera.position.y += (Math.random() - 0.5) * m * 0.7;
    }

    // expire kill feed entries
    const now = performance.now();
    this.killFeed = this.killFeed.filter(k => now - k.t < 4000);

    this.enemies = this.enemies.filter(e => {
      if (e.dead && !e.removed) {
        this.audio.playDeath();
        setTimeout(() => {
          e.dispose(this.scene, this.physics);
          this.enemiesByHandle.delete(e.collider.handle);
        }, 800);
        e.removed = true;
      }
      return !e.removed;
    });

    this.hud.update(this);

    if (this.enemies.length === 0 && !this.transitioning) {
      this.transitioning = true;
      if (this.levelIndex + 1 < LEVELS.length) {
        const gained = this.lives < 3;
        if (gained) this.lives = Math.min(3, this.lives + 1);
        this.showStatsScreen(gained);
        setTimeout(() => {
          this.hideStatsScreen();
          this.levelIndex++;
          this.loadLevel(this.levelIndex);
          this.transitioning = false;
        }, 3200);
      } else {
        this.hud.setLevel('MISSION COMPLETE');
        this.showStatsScreen(false, true);
        setTimeout(() => this.endGame(true), 4000);
      }
    }

    if (this.player.hp <= 0 && !this.transitioning) {
      this.transitioning = true;
      this.showDeathCam();
      if (this.levelIndex === 0) {
        this.lives = 3;
        setTimeout(() => {
          this.hideDeathCam();
          this.loadLevel(this.levelIndex);
          this.transitioning = false;
        }, 2400);
      } else {
        this.lives--;
        if (this.lives <= 0) {
          setTimeout(() => { this.hideDeathCam(); this.endGame(false); }, 2800);
        } else {
          setTimeout(() => {
            this.hideDeathCam();
            this.loadLevel(this.levelIndex);
            this.transitioning = false;
          }, 2400);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    document.getElementById('pause').classList.remove('hidden');
  }

  resumeGame() {
    if (!this.paused) return;
    this.paused = false;
    document.getElementById('pause').classList.add('hidden');
    if (!window.IS_TOUCH) document.body.requestPointerLock();
  }

  restartStage() {
    this.paused = false;
    document.getElementById('pause').classList.add('hidden');
    this.loadLevel(this.levelIndex);
    if (!window.IS_TOUCH) document.body.requestPointerLock();
  }

  quitToMenu() {
    this.paused = false;
    document.getElementById('pause').classList.add('hidden');
    this.endGame();
  }

  throwGrenade() {
    if (!this.player || this.player.grenades <= 0) return;
    if (this.player.grenadeCooldown > 0) return;
    this.player.grenades--;
    this.player.grenadeCooldown = 0.5;

    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);

    // spawn just in front of the camera so it doesn't collide with the player capsule
    const spawn = camPos.clone().addScaledVector(fwd, 0.55);
    spawn.y -= 0.1;

    const vel = fwd.clone().multiplyScalar(15);
    vel.y += 4.5;

    const g = new Grenade(this.scene, this.physics, spawn, vel, this);
    this.grenades.push(g);
  }

  endGame() {
    this.renderer.setAnimationLoop(null);
    this.environment.dispose();
    document.getElementById('menu').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    const mc = document.getElementById('mobileControls');
    if (mc) mc.classList.add('hidden');
    this.hideStatsScreen();
    this.hideDeathCam();
    if (document.pointerLockElement) document.exitPointerLock();
    this.transitioning = false;
  }

  shake(magnitude) {
    this.shakeIntensity = Math.max(this.shakeIntensity, magnitude);
  }

  recordShot() { this.stageStats.shots++; this.runStats.shots++; }
  recordHit() { this.stageStats.hits++; this.runStats.hits++; }
  recordHeadshot() { this.stageStats.headshots++; this.runStats.headshots++; }
  recordKill({ headshot, type } = {}) {
    this.stageStats.kills++;
    this.runStats.kills++;
    this.killFeed.push({ headshot, type: type || 'soldier', t: performance.now() });
    if (this.killFeed.length > 5) this.killFeed.shift();
  }

  showDeathCam() {
    const el = document.getElementById('deathCam');
    if (!el) return;
    const src = (this.player && this.player.lastDamageSource) || 'enemy';
    document.getElementById('deathSource').textContent = String(src).toUpperCase();
    el.classList.remove('hidden');
  }
  hideDeathCam() {
    const el = document.getElementById('deathCam');
    if (el) el.classList.add('hidden');
  }

  showStatsScreen(gainedLife = false, finalMission = false) {
    const el = document.getElementById('statsScreen');
    if (!el) return;
    const s = this.stageStats;
    const acc = s.shots > 0 ? Math.round(100 * s.hits / s.shots) : 0;
    const elapsed = (performance.now() - s.startTime) / 1000;
    const mm = Math.floor(elapsed / 60);
    const ss = (elapsed - mm * 60).toFixed(1);
    document.getElementById('statsTitle').textContent = finalMission
      ? 'MISSION COMPLETE'
      : (gainedLife ? 'LEVEL CLEAR — +1 LIFE' : 'LEVEL CLEAR');
    document.getElementById('statKills').textContent = s.kills;
    document.getElementById('statHeadshots').textContent = s.headshots;
    document.getElementById('statAccuracy').textContent = acc + '%';
    document.getElementById('statTime').textContent = `${mm}:${ss.padStart(4, '0')}`;
    el.classList.remove('hidden');
  }
  hideStatsScreen() {
    const el = document.getElementById('statsScreen');
    if (el) el.classList.add('hidden');
  }

  loadSettings() {
    let s;
    try { s = JSON.parse(localStorage.getItem('shooter.settings') || 'null'); } catch {}
    return s || { sensitivity: 1.0, fov: 75, volume: 0.55 };
  }
  saveSettings() {
    try { localStorage.setItem('shooter.settings', JSON.stringify(this.settings)); } catch {}
  }
  applySettings() {
    if (this.audio && this.audio.master) this.audio.master.gain.value = this.settings.volume;
    if (this.camera) {
      this.camera.fov = this.settings.fov;
      this.camera.updateProjectionMatrix();
    }
    if (this.player) this.player.sensitivity = this.settings.sensitivity;
  }
}
