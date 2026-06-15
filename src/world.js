import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { concreteTexture, brickTexture, metalPanelTexture, woodCrateTexture } from './textures.js';
import { triggerExplosion } from './effects.js';

const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();

// Recursively dispose three.js resources (geometries, materials, textures).
// Uses a shared Set to avoid double-disposing shared resources.
export function disposeObject3D(obj, seen = new Set()) {
  obj.traverse(child => {
    if (child.geometry && !seen.has(child.geometry)) {
      seen.add(child.geometry);
      child.geometry.dispose();
    }
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (seen.has(m)) continue;
        seen.add(m);
        for (const key of ['map', 'roughnessMap', 'normalMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) {
          if (m[key] && !seen.has(m[key])) {
            seen.add(m[key]);
            m[key].dispose();
          }
        }
        m.dispose();
      }
    }
    if (child.isLight && typeof child.dispose === 'function') {
      child.dispose();
    }
  });
}

export class World {
  constructor(scene, physics, def) {
    this.scene = scene;
    this.physics = physics;
    this.def = def;
    this.objects = [];
    this.bodies = [];
    this.barrels = [];

    this.matFloor = this.makeFloorMat();
    this.matWoodCrate = new THREE.MeshStandardMaterial({ map: woodCrateTexture(), roughness: 0.78, metalness: 0.02 });
    this.matConcrete = new THREE.MeshStandardMaterial({ color: 0x6e6e72, roughness: 0.92 });
    this.matMetalDark = new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.55, metalness: 0.6 });
    this.matBarrel = new THREE.MeshStandardMaterial({ color: 0x8a3020, roughness: 0.45, metalness: 0.55 });
    this.matSandbag = new THREE.MeshStandardMaterial({ color: 0x6b5832, roughness: 0.92 });
    this.matVehicle = new THREE.MeshStandardMaterial({ color: 0x3a4030, roughness: 0.55, metalness: 0.4 });
    this.matVehicleDark = new THREE.MeshStandardMaterial({ color: 0x14140c, roughness: 0.4, metalness: 0.5 });
    this.matWheel = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.85 });
    this.matTreeTrunk = new THREE.MeshStandardMaterial({ color: 0x3a2812, roughness: 0.95 });
    this.matFoliage = new THREE.MeshStandardMaterial({ color: 0x2c4a1c, roughness: 0.88 });
    this.matRock = new THREE.MeshStandardMaterial({ color: 0x55584c, roughness: 0.95 });
    this.matCeiling = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.9 });

    if (def.defaultFloor !== false) this.buildFloor(def);
    (def.floors || []).forEach(slab => this.buildFloorSlab(slab));
    if (def.ceiling) this.buildCeiling(def);
    (def.walls || []).forEach(w => this.buildWall(w));
    (def.ramps || []).forEach(r => this.buildRamp(r));
    (def.obstacles || []).forEach(o => this.buildObstacle(o));

    this.pickups = (def.pickups || []).map(p => new AmmoPickup(this, p.x, p.z, p.y ?? 0.3));
  }

  makeFloorMat() {
    const t = concreteTexture();
    const tR = concreteTexture();
    const w = this.def.size.w, d = this.def.size.d;
    t.repeat.set(w / 4, d / 4);
    tR.repeat.set(w / 4, d / 4);
    return new THREE.MeshStandardMaterial({ map: t, roughnessMap: tR, roughness: 0.92, metalness: 0.05 });
  }

  buildFloor(def) {
    const w = def.size.w + 20, d = def.size.d + 20;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.matFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor); this.objects.push(floor);

    const body = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(w / 2, 0.1, d / 2).setTranslation(0, -0.1, 0),
      body
    );
    this.bodies.push(body);
  }

  buildFloorSlab([x, y, z, w, d]) {
    const thickness = 0.3;
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a5e62, roughness: 0.88, metalness: 0.05 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
    m.position.set(x, y - thickness / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m); this.objects.push(m);

    const b = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, y - thickness / 2, z)
    );
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, thickness / 2, d / 2), b);
    this.bodies.push(b);
  }

  buildCeiling(def) {
    const h = def.ceilingHeight ?? 4.2;
    const w = def.size.w, d = def.size.d;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), this.matCeiling);
    m.position.set(0, h, 0);
    m.receiveShadow = true;
    this.scene.add(m); this.objects.push(m);
    const b = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, h, 0));
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, 0.15, d / 2), b);
    this.bodies.push(b);
  }

  buildWall([x, y, z, w, h, d], style = 'auto') {
    const useMetal = style === 'metal' || (style === 'auto' && Math.random() < 0.33);
    const baseTex = useMetal ? metalPanelTexture() : brickTexture();
    baseTex.wrapS = baseTex.wrapT = THREE.RepeatWrapping;
    const maxH = Math.max(w, d);
    baseTex.repeat.set(Math.max(1, maxH / (useMetal ? 4 : 3)), Math.max(1, h / (useMetal ? 4 : 2)));
    const mat = new THREE.MeshStandardMaterial({
      map: baseTex,
      roughness: useMetal ? 0.55 : 0.88,
      metalness: useMetal ? 0.4 : 0.05,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m); this.objects.push(m);

    const b = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), b);
    this.bodies.push(b);
  }

  buildRamp({ from, to, width = 3, mat }) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    const horiz = Math.hypot(dx, dz);
    const length = Math.hypot(horiz, dy);
    const pitch = Math.atan2(dy, horiz);
    const yaw = Math.atan2(dx, dz);
    const cx = (from[0] + to[0]) / 2;
    const cy = (from[1] + to[1]) / 2;
    const cz = (from[2] + to[2]) / 2;
    const thickness = 0.3;
    const material = mat || this.matConcrete;

    const m = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), material);
    m.position.set(cx, cy, cz);
    m.rotation.order = 'YXZ';
    m.rotation.y = yaw;
    m.rotation.x = -pitch;
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m); this.objects.push(m);

    _euler.set(-pitch, yaw, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    const b = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(cx, cy, cz)
        .setRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w })
    );
    this.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(width / 2, thickness / 2, length / 2),
      b
    );
    this.bodies.push(b);
  }

  buildObstacle(o) {
    switch (o.type) {
      case 'crate': return this.makeCrate(o);
      case 'crateStack': return this.makeCrateStack(o);
      case 'pillar': return this.makePillar(o);
      case 'barrel': return this.makeBarrel(o);
      case 'container': return this.makeContainer(o);
      case 'sandbag': return this.makeSandbag(o);
      case 'tree': return this.makeTree(o);
      case 'rock': return this.makeRock(o);
      case 'vehicle': return this.makeVehicle(o);
    }
  }

  addStatic(mesh, colliderDesc, x, y, z, rotY = 0) {
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.scene.add(mesh); this.objects.push(mesh);
    _euler.set(0, rotY, 0);
    _quat.setFromEuler(_euler);
    const b = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(x, y, z)
        .setRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w })
    );
    this.physics.createCollider(colliderDesc, b);
    this.bodies.push(b);
  }

  makeCrate({ x, y = 0.5, z }) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), this.matWoodCrate);
    m.position.set(x, y, z);
    this.addStatic(m, RAPIER.ColliderDesc.cuboid(0.6, 0.5, 0.6), x, y, z);
  }

  makeCrateStack({ x, z, count = 2 }) {
    for (let i = 0; i < count; i++) {
      this.makeCrate({ x: x + (i % 2 === 0 ? 0 : 0.1), y: 0.5 + i * 1.0, z: z + (i % 2 === 0 ? 0 : 0.05) });
    }
  }

  makePillar({ x, z, height = 5, radius = 0.5 }) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), this.matConcrete);
    m.position.set(x, height / 2, z);
    this.addStatic(m, RAPIER.ColliderDesc.cylinder(height / 2, radius), x, height / 2, z);
  }

  makeBarrel({ x, z }) {
    const barrel = new ExplosiveBarrel(this, x, z);
    this.barrels.push(barrel);
  }

  makeContainer({ x, z, rot = 0, color }) {
    const w = 2.4, h = 2.5, d = 6.0;
    const mat = color
      ? new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.5 })
      : this.matMetalDark;
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    group.add(body);
    // ribs
    for (let i = -2; i <= 2; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h - 0.1, 0.04), this.matMetalDark);
      rib.position.z = i * 1.2;
      group.add(rib);
    }
    // doors on one end
    const door = new THREE.Mesh(new THREE.BoxGeometry(w - 0.05, h - 0.15, 0.06), this.matMetalDark);
    door.position.z = d / 2 + 0.01;
    group.add(door);
    group.position.set(x, h / 2, z);
    this.addStatic(group, RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), x, h / 2, z, rot);
  }

  makeSandbag({ x, z, rot = 0 }) {
    const w = 1.6, h = 0.42, d = 0.55;
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.matSandbag);
    group.add(body);
    // top stitch lines
    for (let i = 0; i < 4; i++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, d + 0.01), new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: 0.9 }));
      seam.position.set(-w / 2 + (i + 1) * w / 5, h / 2, 0);
      group.add(seam);
    }
    group.position.set(x, h / 2, z);
    this.addStatic(group, RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), x, h / 2, z, rot);
  }

  makeTree({ x, z, height = 5 }) {
    const trunkH = height * 0.45;
    const trunkR = 0.18 + Math.random() * 0.06;
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.85, trunkR, trunkH, 8), this.matTreeTrunk);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);
    // foliage — 3 spheres at different heights for cumulus-like canopy
    const fH = height * 0.55;
    const fBase = trunkH;
    for (let i = 0; i < 3; i++) {
      const r = 0.7 + Math.random() * 0.5;
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), this.matFoliage);
      s.position.set((Math.random() - 0.5) * 0.6, fBase + fH * (0.2 + i * 0.3), (Math.random() - 0.5) * 0.6);
      s.castShadow = true;
      group.add(s);
    }
    group.position.set(x, 0, z);
    this.scene.add(group); this.objects.push(group);

    // collider only for trunk (foliage non-blocking)
    const b = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, trunkH / 2, z)
    );
    this.physics.createCollider(RAPIER.ColliderDesc.cylinder(trunkH / 2, trunkR), b);
    this.bodies.push(b);
  }

  makeRock({ x, z, size = 1.2 }) {
    const group = new THREE.Group();
    // cluster of irregular boxes
    for (let i = 0; i < 3; i++) {
      const s = size * (0.5 + Math.random() * 0.5);
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.7, s), this.matRock);
      m.position.set((Math.random() - 0.5) * size * 0.5, s * 0.35, (Math.random() - 0.5) * size * 0.5);
      m.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      m.castShadow = true;
      group.add(m);
    }
    group.position.set(x, 0, z);
    this.scene.add(group); this.objects.push(group);
    const b = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, size * 0.35, z)
    );
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(size / 2, size * 0.35, size / 2), b);
    this.bodies.push(b);
  }

  makeVehicle({ x, z, rot = 0 }) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), this.matVehicle);
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.8), this.matVehicle);
    cabin.position.set(0, 1.5, -0.3);
    cabin.castShadow = true;
    group.add(cabin);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 0.05), new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.2, metalness: 0.8 }));
    windshield.position.set(0, 1.55, 0.6);
    windshield.rotation.x = -0.3;
    group.add(windshield);
    // wheels
    [[-0.95, -1.3], [0.95, -1.3], [-0.95, 1.3], [0.95, 1.3]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), this.matWheel);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.42, wz);
      group.add(w);
    });
    group.position.set(x, 0, z);
    this.scene.add(group); this.objects.push(group);

    _euler.set(0, rot, 0);
    _quat.setFromEuler(_euler);
    const b = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(x, 1.0, z)
        .setRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w })
    );
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(1.0, 1.0, 2.1), b);
    this.bodies.push(b);
  }

  dispose(scene, physics) {
    const seen = new Set();
    this.objects.forEach(o => {
      scene.remove(o);
      if (o.isObject3D) disposeObject3D(o, seen);
    });
    this.bodies.forEach(b => physics.removeRigidBody(b));
    this.pickups.forEach(p => p.dispose());
    // also dispose the materials we cached on the world instance
    for (const key of ['matFloor', 'matWoodCrate', 'matConcrete', 'matMetalDark', 'matBarrel', 'matSandbag', 'matVehicle', 'matVehicleDark', 'matWheel', 'matTreeTrunk', 'matFoliage', 'matRock', 'matCeiling']) {
      const m = this[key];
      if (m && !seen.has(m)) {
        seen.add(m);
        if (m.map) m.map.dispose();
        if (m.roughnessMap) m.roughnessMap.dispose();
        m.dispose();
      }
    }
    this.objects = [];
    this.bodies = [];
    this.barrels = [];
    this.pickups = [];
  }
}

export class AmmoPickup {
  constructor(world, x, z, y = 0.3) {
    this.world = world;
    this.scene = world.scene;
    this.x = x; this.y = y; this.z = z;
    this.taken = false;
    this.bobT = Math.random() * Math.PI * 2;

    const group = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x2a4a30, roughness: 0.7, emissive: 0x143820, emissiveIntensity: 0.4 })
    );
    box.castShadow = true;
    group.add(box);
    // glowing label strip
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.06, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x80ff80, emissive: 0x60ff60, emissiveIntensity: 2.5 })
    );
    strip.position.set(0, 0.06, 0.16);
    group.add(strip);
    const stripBack = strip.clone();
    stripBack.position.z = -0.16;
    group.add(stripBack);
    // soft light
    const light = new THREE.PointLight(0x6cff7c, 0.7, 2.4, 2);
    light.position.y = 0.25;
    group.add(light);

    group.position.set(x, y, z);
    this.mesh = group;
    this.scene.add(group);
    world.objects.push(group);
  }

  update(dt) {
    if (this.taken) return;
    this.bobT += dt * 2;
    this.mesh.position.y = this.y + Math.sin(this.bobT) * 0.07;
    this.mesh.rotation.y += dt * 1.4;
  }

  tryPickup(player) {
    if (this.taken) return false;
    const pp = player.body.translation();
    if (Math.hypot(pp.x - this.x, pp.z - this.z) < 1.3 && Math.abs(pp.y - this.y) < 1.5) {
      this.taken = true;
      return true;
    }
    return false;
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}

export class ExplosiveBarrel {
  constructor(world, x, z) {
    this.world = world;
    this.scene = world.scene;
    this.physics = world.physics;
    this.x = x; this.y = 0.425; this.z = z;
    this.exploded = false;

    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.85, 16),
      new THREE.MeshStandardMaterial({ color: 0x9a2818, roughness: 0.55, metalness: 0.4 })
    );
    m.position.set(x, this.y, z);
    m.castShadow = true; m.receiveShadow = true;
    // accent rings
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x14140e, roughness: 0.5, metalness: 0.5 });
    [0.22, -0.22].forEach(yo => {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.06, 16), ringMat);
      r.position.y = yo;
      m.add(r);
    });
    // hazard label
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xf0d020, roughness: 0.5, emissive: 0x4a3000, emissiveIntensity: 0.4 })
    );
    label.position.set(0, 0, 0.365);
    m.add(label);
    // dark cap top
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 16), ringMat);
    cap.position.y = 0.42;
    m.add(cap);

    this.scene.add(m);
    this.mesh = m;
    world.objects.push(m);

    this.body = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, this.y, z)
    );
    this.collider = this.physics.createCollider(
      RAPIER.ColliderDesc.cylinder(0.425, 0.36),
      this.body
    );
  }

  explode(game) {
    if (this.exploded) return;
    this.exploded = true;
    const { x, y, z } = this;

    triggerExplosion({
      scene: this.scene,
      physics: this.physics,
      audio: game ? game.audio : null,
      game,
      x, y, z,
      blastRadius: 5.5,
      damage: 110,
    });

    if (game) game.barrelsByHandle.delete(this.collider.handle);
    this.scene.remove(this.mesh);
    this.physics.removeRigidBody(this.body);
    this.mesh = null;
    this.body = null;
  }
}
