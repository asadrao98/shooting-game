import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { spawnTracer } from './effects.js';
import { disposeObject3D } from './world.js';

const WEAPON_DEFS = {
  pistol: {
    name: 'PISTOL', audio: 'pistol',
    magSize: 12, reserve: 60,
    fireRate: 0.18, damage: 26, spread: 0.008, reloadTime: 1.2,
    pellets: 1, hipFireRange: 60, tracerColor: 0xfff0a0,
    recoilOffset: 0.05, recoilPitch: 0.035, fovKick: 1.5,
  },
  rifle: {
    name: 'RIFLE', audio: 'rifle',
    magSize: 30, reserve: 90,
    fireRate: 0.09, damage: 32, spread: 0.012, reloadTime: 1.6,
    pellets: 1, hipFireRange: 90, tracerColor: 0xffd060,
    recoilOffset: 0.06, recoilPitch: 0.03, fovKick: 2,
  },
  shotgun: {
    name: 'SHOTGUN', audio: 'shotgun',
    magSize: 6, reserve: 24,
    fireRate: 0.6, damage: 14, spread: 0.07, reloadTime: 2.0,
    pellets: 7, hipFireRange: 35, tracerColor: 0xff9040,
    recoilOffset: 0.14, recoilPitch: 0.08, fovKick: 4,
  },
};

export class Weapon {
  constructor(camera, scene, physics, player, game) {
    this.camera = camera;
    this.scene = scene;
    this.physics = physics;
    this.player = player;
    this.game = game;

    // independent state per weapon
    this.weapons = {};
    for (const [k, def] of Object.entries(WEAPON_DEFS)) {
      this.weapons[k] = { ...def, mag: def.magSize, reserve: def.reserve };
    }
    this.active = 'rifle';

    this.cooldown = 0;
    this.reloading = 0;
    this.firing = false;
    this.recoilOffset = 0;
    this.recoilPitch = 0;
    this.flashIntensity = 0;
    this.switchT = 0;

    this.buildModel();

    this._md = e => {
      if (e.button === 0 && document.pointerLockElement === document.body) this.firing = true;
    };
    this._mu = e => { if (e.button === 0) this.firing = false; };
    window.addEventListener('mousedown', this._md);
    window.addEventListener('mouseup', this._mu);
  }

  get current() { return this.weapons[this.active]; }

  buildModel() {
    this.group = new THREE.Group();
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.45, metalness: 0.75 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.5 });

    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.5), gunMat);
    this.grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.1), accentMat);
    this.grip.position.set(0, -0.13, 0.1);
    this.barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 12), gunMat);
    this.barrel.rotation.x = Math.PI / 2;
    this.barrel.position.set(0, 0.02, -0.32);
    this.sight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.035, 0.08), accentMat);
    this.sight.position.set(0, 0.085, -0.05);

    this.group.add(this.body, this.grip, this.barrel, this.sight);
    this.group.position.set(0.22, -0.2, -0.5);
    this.camera.add(this.group);
    if (!this.scene.children.includes(this.camera)) this.scene.add(this.camera);

    this.flash = new THREE.PointLight(0xffd28a, 0, 5, 2);
    this.flash.position.set(0.22, -0.18, -0.85);
    this.camera.add(this.flash);

    this.flashMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0 })
    );
    this.flashMesh.position.set(0.22, -0.18, -0.9);
    this.camera.add(this.flashMesh);

    this.applyWeaponLook();
  }

  applyWeaponLook() {
    // Adjust visual properties per weapon (subtle re-skin)
    if (this.active === 'pistol') {
      this.body.scale.set(0.7, 0.85, 0.6);
      this.barrel.scale.set(0.8, 0.5, 0.8);
      this.sight.visible = false;
    } else if (this.active === 'shotgun') {
      this.body.scale.set(1.05, 1, 1.4);
      this.barrel.scale.set(1.6, 1.2, 1);
      this.sight.visible = true;
    } else {
      this.body.scale.set(1, 1, 1);
      this.barrel.scale.set(1, 1, 1);
      this.sight.visible = true;
    }
  }

  switchTo(key) {
    if (!this.weapons[key] || this.active === key || this.reloading > 0) return;
    this.active = key;
    this.cooldown = 0.25;
    this.switchT = 0.25;
    this.applyWeaponLook();
    if (this.game && this.game.audio) this.game.audio.playWeaponSwitch();
  }

  reload() {
    const w = this.current;
    if (this.reloading > 0 || w.mag === w.magSize || w.reserve === 0) return;
    this.reloading = w.reloadTime;
    if (this.game && this.game.audio) this.game.audio.playReload();
  }

  fire() {
    if (this.reloading > 0 || this.switchT > 0) return;
    const w = this.current;
    if (w.mag <= 0) {
      this.game.audio.playEmpty();
      this.cooldown = 0.25;
      this.reload();
      return;
    }
    w.mag--;
    this.cooldown = w.fireRate;
    this.recoilOffset = w.recoilOffset;
    this.recoilPitch = w.recoilPitch + (Math.random() - 0.5) * 0.01;
    this.flashIntensity = 5;
    if (this.game && this.game.audio) this.game.audio.playGunshotVariant(w.audio);

    const muzzle = new THREE.Vector3();
    this.flashMesh.getWorldPosition(muzzle);
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);

    let anyHit = false;
    let hitEnemy = false;
    let headshot = false;

    if (this.game) this.game.recordShot();
    if (this.game) this.game.shake(w === this.weapons.shotgun ? 0.18 : 0.06);

    for (let i = 0; i < w.pellets; i++) {
      const dir = camDir.clone();
      const sp = this.player.input.ads ? w.spread * 0.3 : w.spread;
      dir.x += (Math.random() - 0.5) * sp;
      dir.y += (Math.random() - 0.5) * sp;
      dir.z += (Math.random() - 0.5) * sp;
      dir.normalize();

      const ray = new RAPIER.Ray({ x: camPos.x, y: camPos.y, z: camPos.z }, { x: dir.x, y: dir.y, z: dir.z });
      const hit = this.physics.castRay(ray, 200, true, undefined, undefined, this.player.collider);

      let endPoint;
      if (hit) {
        const p = ray.pointAt(hit.timeOfImpact);
        endPoint = new THREE.Vector3(p.x, p.y, p.z);
        const enemy = this.game.enemiesByHandle.get(hit.collider.handle);
        const barrel = this.game.barrelsByHandle.get(hit.collider.handle);
        if (enemy) {
          anyHit = true; hitEnemy = true;
          const enemyY = enemy.body.translation().y;
          const isHead = p.y > enemyY + 0.42;
          const dmg = isHead ? w.damage * 2 : w.damage;
          enemy.damage(dmg, { source: 'player', headshot: isHead });
          if (isHead) headshot = true;
        } else if (barrel) {
          anyHit = true;
          barrel.explode(this.game);
        }
        this.spawnImpact(endPoint);
      } else {
        endPoint = camPos.clone().addScaledVector(dir, 200);
      }
      spawnTracer(this.scene, muzzle.clone(), endPoint, w.tracerColor);
    }

    if (anyHit && hitEnemy) {
      this.showHitmarker(headshot);
      if (headshot) {
        this.game.audio.playHeadshot();
        this.game.recordHeadshot();
      } else {
        this.game.audio.playHitmarker();
      }
      this.game.recordHit();
    }
  }

  showHitmarker(headshot = false) {
    const el = document.getElementById('hitmarker');
    if (!el) return;
    el.style.opacity = '1';
    el.style.transform = headshot ? 'rotate(45deg) scale(1.4)' : 'rotate(0deg) scale(1)';
    el.style.filter = headshot ? 'drop-shadow(0 0 4px #ff5040)' : '';
    clearTimeout(this._hmT);
    this._hmT = setTimeout(() => { el.style.opacity = '0'; }, headshot ? 200 : 120);
  }

  spawnImpact(pos) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe0a0 })
    );
    m.position.copy(pos);
    this.scene.add(m);
    setTimeout(() => this.scene.remove(m), 300);
  }

  update(dt) {
    const w = this.current;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.switchT = Math.max(0, this.switchT - dt);
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = w.magSize - w.mag;
        const give = Math.min(need, w.reserve);
        w.mag += give;
        w.reserve -= give;
        this.reloading = 0;
      }
    }
    if (this.firing && this.cooldown === 0) this.fire();

    this.recoilOffset += (0 - this.recoilOffset) * Math.min(1, dt * 12);
    this.recoilPitch += (0 - this.recoilPitch) * Math.min(1, dt * 14);
    this.flashIntensity += (0 - this.flashIntensity) * Math.min(1, dt * 22);

    const adsTarget = new THREE.Vector3(0, -0.105, -0.35);
    const hipTarget = new THREE.Vector3(0.22, -0.2, -0.5 + this.recoilOffset);
    const target = this.player.input.ads ? adsTarget : hipTarget;

    // weapon switch lowers gun then raises
    if (this.switchT > 0) {
      const t = this.switchT / 0.25;
      target.y -= 0.4 * t;
    }

    this.group.position.lerp(target, Math.min(1, dt * 12));
    this.group.rotation.x = -this.recoilPitch;

    if (this.reloading > 0) {
      this.group.position.y -= 0.15 * Math.sin((w.reloadTime - this.reloading) * 4);
      this.group.rotation.z = Math.sin((w.reloadTime - this.reloading) * 6) * 0.3;
    } else {
      this.group.rotation.z = 0;
    }

    this.flash.intensity = this.flashIntensity;
    this.flashMesh.material.opacity = Math.min(1, this.flashIntensity / 5);
  }

  // expose current ammo for HUD compatibility
  get mag() { return this.current.mag; }
  get reserve() { return this.current.reserve; }

  dispose() {
    window.removeEventListener('mousedown', this._md);
    window.removeEventListener('mouseup', this._mu);
    disposeObject3D(this.group);
    this.camera.remove(this.group);
    if (this.flashMesh.geometry) this.flashMesh.geometry.dispose();
    if (this.flashMesh.material) this.flashMesh.material.dispose();
    this.camera.remove(this.flash);
    this.camera.remove(this.flashMesh);
  }
}
