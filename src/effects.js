import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export function spawnTracer(scene, from, to, color = 0xfff0a0) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 0.5) return;
  // trace a short segment near the start that flies along the path
  const segmentLen = Math.min(2.0, len * 0.4);
  const speed = 220; // m/s tracer speed (visual)
  const points = [from.clone(), from.clone().addScaledVector(dir, segmentLen / len)];
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
  const line = new THREE.Line(geom, mat);
  scene.add(line);

  const start = performance.now();
  const totalT = len / speed;
  const positions = line.geometry.attributes.position.array;
  const animate = () => {
    const t = (performance.now() - start) / 1000;
    const u = Math.min(1, t / totalT);
    const tailU = Math.max(0, u - segmentLen / len);
    const headPos = new THREE.Vector3().copy(from).addScaledVector(dir, u);
    const tailPos = new THREE.Vector3().copy(from).addScaledVector(dir, tailU);
    positions[0] = tailPos.x; positions[1] = tailPos.y; positions[2] = tailPos.z;
    positions[3] = headPos.x; positions[4] = headPos.y; positions[5] = headPos.z;
    line.geometry.attributes.position.needsUpdate = true;
    mat.opacity = 0.95 * (1 - u * 0.4);
    if (u < 1) requestAnimationFrame(animate);
    else {
      scene.remove(line);
      geom.dispose();
      mat.dispose();
    }
  };
  requestAnimationFrame(animate);
}

export function triggerExplosion({ scene, physics, audio, game, x, y, z, blastRadius = 5.5, damage = 110, playerDamageMult = 0.7 }) {
  const blast = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0.95 })
  );
  blast.position.set(x, y + 0.3, z);
  scene.add(blast);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 })
  );
  core.position.set(x, y + 0.3, z);
  scene.add(core);

  const light = new THREE.PointLight(0xffa848, 12, 14, 2);
  light.position.set(x, y + 0.8, z);
  scene.add(light);

  const debris = [];
  for (let i = 0; i < 18; i++) {
    const isSpark = i < 7;
    const sm = new THREE.Mesh(
      new THREE.SphereGeometry(isSpark ? 0.06 : 0.22 + Math.random() * 0.18, 8, 6),
      new THREE.MeshBasicMaterial({
        color: isSpark ? 0xffd070 : 0x3a3a3a,
        transparent: true, opacity: isSpark ? 1 : 0.78,
      })
    );
    sm.position.set(x, y + 0.3, z);
    const a = Math.random() * Math.PI * 2;
    const vel = isSpark ? 6 + Math.random() * 4 : 2 + Math.random() * 2.5;
    sm.userData = {
      vx: Math.cos(a) * vel,
      vy: (isSpark ? 5 : 2.5) + Math.random() * 3,
      vz: Math.sin(a) * vel,
      life: 0,
      max: isSpark ? 0.7 : 1.6,
      isSpark,
    };
    scene.add(sm);
    debris.push(sm);
  }

  const t0 = performance.now();
  let last = t0;
  const animate = () => {
    const nowT = performance.now();
    const dt = Math.min(0.05, (nowT - last) / 1000);
    last = nowT;
    const elapsed = (nowT - t0) / 1000;
    const t = Math.min(1, elapsed / 0.55);
    blast.scale.setScalar(1 + t * 12);
    blast.material.opacity = (1 - t) * 0.85;
    core.scale.setScalar(1 + t * 6);
    core.material.opacity = Math.max(0, 1 - t * 2.5);
    light.intensity = (1 - t) * 14;
    for (const d of debris) {
      d.position.x += d.userData.vx * dt;
      d.position.y += d.userData.vy * dt;
      d.position.z += d.userData.vz * dt;
      d.userData.vy -= (d.userData.isSpark ? 8 : 2.8) * dt;
      d.userData.vx *= 0.96;
      d.userData.vz *= 0.96;
      d.userData.life += dt;
      const lt = Math.min(1, d.userData.life / d.userData.max);
      d.material.opacity = (d.userData.isSpark ? 1 : 0.78) * (1 - lt);
      if (!d.userData.isSpark) d.scale.setScalar(1 + lt * 1.8);
    }
    if (elapsed < 1.7) requestAnimationFrame(animate);
    else {
      [blast, core, light, ...debris].forEach(o => {
        scene.remove(o);
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
  };
  requestAnimationFrame(animate);

  if (audio) {
    audio.playExplosion({
      position: { x, y, z },
      listener: game && game.player ? { position: game.player.body.translation(), yaw: game.player.yaw } : null,
    });
  }

  if (game) {
    for (const e of game.enemies) {
      if (e.dead) continue;
      const ep = e.body.translation();
      const d = Math.hypot(ep.x - x, ep.y - y, ep.z - z);
      if (d < blastRadius) e.damage(damage * (1 - d / blastRadius), { source: 'explosion' });
    }
    if (game.player) {
      const pp = game.player.body.translation();
      const pd = Math.hypot(pp.x - x, pp.y - y, pp.z - z);
      if (pd < blastRadius) game.player.damage(damage * playerDamageMult * (1 - pd / blastRadius), 'explosion');
      // screen shake — scaled by proximity
      if (game.shake) {
        const shakeAmt = Math.max(0, 1.0 * (1 - pd / (blastRadius * 4)));
        game.shake(shakeAmt);
      }
    }
    if (game.barrels) {
      for (const b of game.barrels) {
        if (b.exploded) continue;
        const cd = Math.hypot(b.x - x, b.z - z);
        if (cd < blastRadius * 1.05) setTimeout(() => b.explode(game), 90 + Math.random() * 140);
      }
    }
  }
}

export class Grenade {
  constructor(scene, physics, position, velocity, game) {
    this.scene = scene;
    this.physics = physics;
    this.game = game;
    this.fuse = 2.4;
    this.exploded = false;
    this.removed = false;
    this.beepT = 0;

    const group = new THREE.Group();
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x3a4a30, roughness: 0.6, metalness: 0.3 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x1a1a14, roughness: 0.5, metalness: 0.5 });
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x441500, emissive: 0xff3a00, emissiveIntensity: 1.5, roughness: 0.4 });
    this.ledMat = ledMat;

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), shellMat);
    body.castShadow = true;
    group.add(body);
    // segmentation rings to look like a fragmentation grenade
    [-0.04, 0.04].forEach(yo => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.008, 6, 16), ringMat);
      r.rotation.x = Math.PI / 2;
      r.position.y = yo;
      group.add(r);
    });
    const fuseCap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.05, 10), ringMat);
    fuseCap.position.y = 0.085;
    group.add(fuseCap);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), ledMat);
    led.position.y = 0.115;
    group.add(led);

    group.position.copy(position);
    scene.add(group);
    this.mesh = group;

    this.body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setLinvel(velocity.x, velocity.y, velocity.z)
        .setAngvel({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 8 })
        .setLinearDamping(0.18)
        .setAngularDamping(0.4)
    );
    this.collider = physics.createCollider(
      RAPIER.ColliderDesc.ball(0.085)
        .setRestitution(0.42)
        .setFriction(0.7)
        .setDensity(8),
      this.body
    );
  }

  update(dt) {
    if (this.exploded) return false;
    const t = this.body.translation();
    const r = this.body.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    this.fuse -= dt;
    // pulsing LED faster as fuse runs out
    this.beepT += dt * (4 + (2.4 - this.fuse) * 4);
    const pulse = (Math.sin(this.beepT) + 1) * 0.5;
    this.ledMat.emissiveIntensity = 0.6 + pulse * 2.4;
    if (this.fuse <= 0) {
      this.detonate();
      return false;
    }
    return true;
  }

  detonate() {
    if (this.exploded) return;
    this.exploded = true;
    const t = this.body.translation();
    triggerExplosion({
      scene: this.scene,
      physics: this.physics,
      audio: this.game ? this.game.audio : null,
      game: this.game,
      x: t.x, y: t.y, z: t.z,
      blastRadius: 5.5,
      damage: 160,
    });
    this.dispose();
  }

  dispose() {
    if (this.removed) return;
    this.removed = true;
    this.scene.remove(this.mesh);
    if (this.body) this.physics.removeRigidBody(this.body);
    this.mesh = null;
    this.body = null;
  }
}
