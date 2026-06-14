import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

function buildSoldier() {
  const skin = new THREE.MeshStandardMaterial({ color: 0xb78a6c, roughness: 0.7 });
  const fatigues = new THREE.MeshStandardMaterial({ color: 0x4a5238, roughness: 0.9 });
  const fatiguesDark = new THREE.MeshStandardMaterial({ color: 0x363c28, roughness: 0.92 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x3a4030, roughness: 0.92 });
  const vest = new THREE.MeshStandardMaterial({ color: 0x1c1f14, roughness: 0.78 });
  const vestPouch = new THREE.MeshStandardMaterial({ color: 0x2a2d20, roughness: 0.85 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x10100c, roughness: 0.55, metalness: 0.12 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x14140e, roughness: 0.8 });
  const helmet = new THREE.MeshStandardMaterial({ color: 0x2a3020, roughness: 0.5, metalness: 0.25 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.4, metalness: 0.82 });
  const gunAccent = new THREE.MeshStandardMaterial({ color: 0x282830, roughness: 0.55, metalness: 0.6 });
  const woodGrip = new THREE.MeshStandardMaterial({ color: 0x3a2a14, roughness: 0.75 });
  const allMats = [skin, fatigues, fatiguesDark, pants, vest, vestPouch, boot, glove, helmet];

  const root = new THREE.Group();
  const pelvis = new THREE.Group();
  pelvis.position.y = 0.95;
  root.add(pelvis);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.26), vest);
  belt.position.y = 0;
  belt.castShadow = true;
  pelvis.add(belt);

  const torso = new THREE.Group();
  pelvis.add(torso);

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.26), fatigues);
  torsoMesh.position.y = 0.3;
  torsoMesh.castShadow = true;
  torso.add(torsoMesh);

  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.38, 0.3), vest);
  vestMesh.position.y = 0.3;
  vestMesh.castShadow = true;
  torso.add(vestMesh);

  // mag pouches on vest
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.06), vestPouch);
    p.position.set(-0.13 + i * 0.13, 0.22, 0.17);
    p.castShadow = true;
    torso.add(p);
  }
  // shoulder strap
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), vestPouch);
  strap.position.set(-0.12, 0.32, 0.15);
  strap.rotation.z = -0.3;
  torso.add(strap);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), skin);
  neck.position.y = 0.58;
  torso.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.68;
  torso.add(headGroup);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skin);
  head.scale.set(1, 1.15, 1.05);
  head.castShadow = true;
  headGroup.add(head);

  const helmetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2 + 0.3),
    helmet
  );
  helmetMesh.position.y = 0.01;
  helmetMesh.scale.set(1.05, 1, 1.15);
  helmetMesh.castShadow = true;
  headGroup.add(helmetMesh);

  const helmetBrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.025, 0.08),
    helmet
  );
  helmetBrim.position.set(0, 0.03, -0.1);
  headGroup.add(helmetBrim);

  const strap2 = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 4, 12, Math.PI), vestPouch);
  strap2.rotation.x = Math.PI / 2;
  strap2.rotation.z = Math.PI;
  strap2.position.y = -0.04;
  headGroup.add(strap2);

  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.25, 0.5, 0);
    torso.add(shoulder);

    const shoulderPad = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), fatiguesDark);
    shoulderPad.scale.set(1, 0.9, 1);
    shoulderPad.castShadow = true;
    shoulder.add(shoulderPad);

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), fatigues);
    upper.position.y = -0.16;
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);

    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), fatigues);
    lower.position.y = -0.14;
    lower.castShadow = true;
    elbow.add(lower);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.07), glove);
    hand.position.y = -0.28;
    hand.castShadow = true;
    elbow.add(hand);

    return { shoulder, elbow, hand };
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, 0, 0);
    pelvis.add(hip);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.3, 4, 8), pants);
    upper.position.y = -0.22;
    upper.castShadow = true;
    hip.add(upper);

    // cargo pocket
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.04), pants);
    pocket.position.set(side * 0.08, -0.22, 0.085);
    hip.add(pocket);

    const knee = new THREE.Group();
    knee.position.y = -0.46;
    hip.add(knee);
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 4, 8), pants);
    lower.position.y = -0.2;
    lower.castShadow = true;
    knee.add(lower);

    const bootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.26), boot);
    bootMesh.position.set(0, -0.42, 0.03);
    bootMesh.castShadow = true;
    knee.add(bootMesh);
    const toe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.08), boot);
    toe.position.set(0, -0.44, 0.15);
    knee.add(toe);

    return { hip, knee };
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // Aim mount — gun lives here, NOT in the arm. Pitches independently to track player.
  const aimMount = new THREE.Group();
  aimMount.position.set(0.06, 0.32, -0.02);
  torso.add(aimMount);

  const gun = new THREE.Group();
  aimMount.add(gun);

  // receiver
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.42), gunMat);
  gunBody.position.z = -0.1;
  gunBody.castShadow = true;
  gun.add(gunBody);
  // barrel
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 10), gunMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.012, -0.46);
  gun.add(gunBarrel);
  // muzzle
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 8), gunAccent);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.012, -0.65);
  gun.add(muzzle);
  // top sight rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.32), gunAccent);
  rail.position.set(0, 0.075, -0.15);
  gun.add(rail);
  // rear sight
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.04), gunAccent);
  rearSight.position.set(0, 0.11, 0.0);
  gun.add(rearSight);
  // pistol grip (rear hand goes here)
  const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.06), woodGrip);
  pistolGrip.position.set(0, -0.1, 0.04);
  pistolGrip.rotation.x = 0.25;
  gun.add(pistolGrip);
  // foregrip / handguard (front hand goes here)
  const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.18), woodGrip);
  foregrip.position.set(0, -0.04, -0.32);
  gun.add(foregrip);
  // mag
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.06), gunAccent);
  mag.position.set(0, -0.13, -0.04);
  mag.rotation.x = -0.05;
  gun.add(mag);
  // stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.16), woodGrip);
  stock.position.set(0, 0.005, 0.2);
  gun.add(stock);

  const flashLight = new THREE.PointLight(0xffd28a, 0, 7, 2);
  flashLight.position.set(0, 0.012, -0.72);
  gun.add(flashLight);
  const flashMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0 })
  );
  flashMesh.position.set(0, 0.012, -0.72);
  gun.add(flashMesh);

  return { root, pelvis, torso, headGroup, leftArm, rightArm, leftLeg, rightLeg, aimMount, gun, flashLight, flashMesh, allMats };
}

// arm rotations for "rifle ready" pose — right hand on pistol grip, left on foregrip
const POSE_AIM = {
  rightShoulder: { x: -1.55, y: -0.35, z: -0.2 },
  rightElbow:    { x: -0.55, y: 0, z: 0 },
  leftShoulder:  { x: -1.45, y: 0.7, z: 0.25 },
  leftElbow:     { x: -1.0, y: 0, z: 0 },
};
const POSE_IDLE = {
  rightShoulder: { x: 0, y: 0, z: 0.05 },
  rightElbow:    { x: 0, y: 0, z: 0 },
  leftShoulder:  { x: 0, y: 0, z: -0.05 },
  leftElbow:     { x: 0, y: 0, z: 0 },
};

function lerpRot(target, a, b, t, baseSwingX = 0) {
  target.x = (a.x + baseSwingX) * (1 - t) + b.x * t;
  target.y = a.y * (1 - t) + b.y * t;
  target.z = a.z * (1 - t) + b.z * t;
}

const ENEMY_TYPES = {
  standard: { hpMult: 1, speedMult: 1, shotMult: 1, fireMult: 1, meleeMult: 1, canShoot: true,
    vestColor: 0x1c1f14, fatigueColor: 0x4a5238, helmetColor: 0x2a3020, scale: 1, label: 'soldier' },
  heavy: { hpMult: 2.2, speedMult: 0.65, shotMult: 1.5, fireMult: 0.55, meleeMult: 1.2, canShoot: true,
    vestColor: 0x141612, fatigueColor: 0x383d28, helmetColor: 0x1a1e14, scale: 1.18, label: 'heavy' },
  rusher: { hpMult: 0.55, speedMult: 1.85, shotMult: 0, fireMult: 0, meleeMult: 1.5, canShoot: false,
    vestColor: 0x4a1a14, fatigueColor: 0x6a2818, helmetColor: 0x381810, scale: 0.96, label: 'rusher' },
};

export class Enemy {
  constructor(scene, physics, spawn, diff, game) {
    this.scene = scene;
    this.physics = physics;
    this.game = game;
    this.type = spawn.type || 'standard';
    const T = ENEMY_TYPES[this.type] || ENEMY_TYPES.standard;
    this.typeLabel = T.label;
    this.canShoot = T.canShoot;

    this.maxHp = 75 * diff * T.hpMult;
    this.hp = this.maxHp;
    this.speed = 2.4 * diff * T.speedMult;
    this.meleeDamage = 8 * diff * T.meleeMult;
    this.shotDamage = 7 * diff * T.shotMult;
    this.fireInterval = (1.4 / diff) / Math.max(0.1, T.fireMult);
    this.inaccuracy = 0.06 / diff;
    this.detectRange = 28;
    this.engageRange = T.canShoot ? 18 : 0;
    this.meleeRange = 1.8;
    this.shootCooldown = 0.5 + Math.random() * 1.0;
    this.meleeCooldown = 0;
    this.dead = false;
    this.removed = false;
    this.state = 'idle';
    this.aimT = 0;
    this.walkT = Math.random() * Math.PI * 2;
    this.walkAmt = 0;
    this.breathT = Math.random() * Math.PI * 2;
    this.flashIntensity = 0;
    this.deathT = 0;
    this.aimPitch = 0;

    const spawnY = spawn.y ?? 0.85;

    const rig = buildSoldier();
    // re-color per type
    rig.allMats[1].color.setHex(T.fatigueColor); // fatigues
    rig.allMats[2].color.setHex(T.fatigueColor * 0xfefefe & 0x808080);
    rig.allMats[4].color.setHex(T.vestColor); // vest
    rig.allMats[8].color.setHex(T.helmetColor); // helmet
    rig.root.scale.setScalar(T.scale);
    if (!T.canShoot) {
      // rushers don't carry guns
      if (rig.gun) rig.gun.visible = false;
    }
    this.rig = rig;
    this.mesh = rig.root;
    this.mesh.position.set(spawn.x, spawnY - 0.85, spawn.z);
    scene.add(this.mesh);

    // floating health bar (sprite) above head
    const barCanvas = document.createElement('canvas');
    barCanvas.width = 128; barCanvas.height = 18;
    this.barCanvas = barCanvas;
    this.barCtx = barCanvas.getContext('2d');
    this.barTex = new THREE.CanvasTexture(barCanvas);
    this.barTex.colorSpace = THREE.SRGBColorSpace;
    this.barMat = new THREE.SpriteMaterial({ map: this.barTex, depthTest: false, depthWrite: false, transparent: true, opacity: 0 });
    this.barSprite = new THREE.Sprite(this.barMat);
    this.barSprite.scale.set(1.1, 0.16, 1);
    this.barSprite.position.set(0, 1.95, 0);
    this.barSprite.renderOrder = 999;
    this.mesh.add(this.barSprite);
    this.barTimer = 0;

    const halfH = (1.7 - 0.35 * 2) / 2;
    this.body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawnY, spawn.z)
    );
    this.collider = physics.createCollider(
      RAPIER.ColliderDesc.capsule(halfH, 0.35),
      this.body
    );

    this.controller = physics.createCharacterController(0.02);
    this.controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
    this.controller.enableAutostep(0.4, 0.2, true);
    this.controller.enableSnapToGround(0.4);
    this.vy = 0;
  }

  damage(amount, opts = {}) {
    this.hp -= amount;
    this.rig.allMats.forEach(m => {
      m.emissive = new THREE.Color(opts.headshot ? 0xff2828 : 0xff5050);
      m.emissiveIntensity = opts.headshot ? 1.8 : 1.2;
    });
    clearTimeout(this._flashT);
    this._flashT = setTimeout(() => {
      this.rig.allMats.forEach(m => { if (m) m.emissiveIntensity = 0; });
    }, 90);
    this.drawHealthBar();
    this.barTimer = 3.0;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      this.deathT = 0;
      if (this.game && this.game.recordKill) {
        this.game.recordKill({ headshot: !!opts.headshot, source: opts.source, type: this.typeLabel });
      }
    }
  }

  drawHealthBar() {
    const ctx = this.barCtx;
    const w = 128, h = 18;
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(12,14,18,0.88)';
    ctx.fillRect(0, 0, w, h);
    const fillW = (w - 4) * pct;
    let color;
    if (pct > 0.6) color = '#5cd86c';
    else if (pct > 0.3) color = '#e8c850';
    else color = '#e84848';
    ctx.fillStyle = color;
    ctx.fillRect(2, 2, fillW, h - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    this.barTex.needsUpdate = true;
  }

  hasLineOfSight(player) {
    const pos = this.body.translation();
    const ppos = player.body.translation();
    const origin = { x: pos.x, y: pos.y + 0.5, z: pos.z };
    const dx = ppos.x - origin.x;
    const dy = ppos.y - origin.y;
    const dz = ppos.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.01) return true;
    const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
    const ray = new RAPIER.Ray(origin, dir);
    const hit = this.physics.castRay(ray, dist + 0.1, true, undefined, undefined, this.collider);
    if (!hit) return true;
    return hit.collider.handle === player.collider.handle;
  }

  shoot(player) {
    // muzzle world position
    const muzzleWorld = new THREE.Vector3(0, 0.012, -0.72);
    this.rig.gun.localToWorld(muzzleWorld);

    const ppos = player.body.translation();
    _v2.set(ppos.x, ppos.y + (Math.random() - 0.4) * 0.4, ppos.z);
    const dir = _v2.sub(muzzleWorld).normalize();
    dir.x += (Math.random() - 0.5) * this.inaccuracy;
    dir.y += (Math.random() - 0.5) * this.inaccuracy;
    dir.z += (Math.random() - 0.5) * this.inaccuracy;
    dir.normalize();

    const ray = new RAPIER.Ray(
      { x: muzzleWorld.x, y: muzzleWorld.y, z: muzzleWorld.z },
      { x: dir.x, y: dir.y, z: dir.z }
    );
    const hit = this.physics.castRay(ray, 80, true, undefined, undefined, this.collider);
    if (hit) {
      if (hit.collider.handle === player.collider.handle) {
        player.damage(this.shotDamage, this.typeLabel);
      } else if (this.game && this.game.barrelsByHandle) {
        const b = this.game.barrelsByHandle.get(hit.collider.handle);
        if (b) b.explode(this.game);
      }
    }
    this.flashIntensity = 5;
    if (this.game && this.game.audio) {
      this.game.audio.playGunshot({
        volume: 0.85,
        position: { x: muzzleWorld.x, y: muzzleWorld.y, z: muzzleWorld.z },
        listener: { position: player.body.translation(), yaw: player.yaw },
      });
    }
  }

  update(dt, player) {
    if (this.dead) {
      this.deathT += dt;
      const t = Math.min(1, this.deathT * 2.5);
      this.mesh.rotation.x = -Math.PI / 2 * t;
      this.rig.flashLight.intensity = 0;
      this.barMat.opacity = 0;
      return;
    }

    if (this.barTimer > 0) {
      this.barTimer -= dt;
      const fade = Math.min(1, this.barTimer / 0.5);
      this.barMat.opacity = fade;
    } else {
      this.barMat.opacity = 0;
    }

    const pos = this.body.translation();
    const ppos = player.body.translation();
    const dx = ppos.x - pos.x;
    const dz = ppos.z - pos.z;
    const dist = Math.hypot(dx, dz);

    let los = false;
    if (dist < this.detectRange) los = this.hasLineOfSight(player);

    if (dist < this.meleeRange && los) {
      this.state = 'melee';
    } else if (dist < this.detectRange && los && this.canShoot) {
      this.state = dist > this.engageRange ? 'chase' : 'shoot';
    } else if (dist < this.detectRange) {
      this.state = 'chase';
    } else {
      this.state = 'idle';
    }

    let vx = 0, vz = 0;
    if (this.state === 'chase') {
      const inv = 1 / Math.max(0.001, dist);
      const fx = dx * inv, fz = dz * inv;

      const probeOrigin = { x: pos.x, y: pos.y + 0.15, z: pos.z };
      const probeDist = 1.8;
      const playerHandle = player.collider.handle;
      const enemyMap = this.game && this.game.enemiesByHandle;
      const filter = c => c.handle !== playerHandle && !(enemyMap && enemyMap.has(c.handle));

      const probe = (dx2, dz2) => {
        const ray = new RAPIER.Ray(probeOrigin, { x: dx2, y: 0, z: dz2 });
        const hit = this.physics.castRay(ray, probeDist, true, undefined, undefined, undefined, undefined, filter);
        return !hit || hit.timeOfImpact > probeDist * 0.85;
      };

      let cx = fx, cz = fz;
      if (!probe(fx, fz)) {
        // direct path blocked — try widening angles, prefer one consistent side per enemy
        if (this._steerSide === undefined) this._steerSide = Math.random() < 0.5 ? -1 : 1;
        const sequence = [0.55, 1.1, 1.7].flatMap(a => [a * this._steerSide, a * -this._steerSide]);
        for (const a of sequence) {
          const cos = Math.cos(a), sin = Math.sin(a);
          const px = fx * cos - fz * sin;
          const pz = fx * sin + fz * cos;
          if (probe(px, pz)) { cx = px; cz = pz; break; }
        }
      } else {
        // clear path — gradually forget the steer preference
        this._steerSide = undefined;
      }
      vx = cx * this.speed;
      vz = cz * this.speed;
    }

    this.vy -= 24 * dt;
    const desired = { x: vx * dt, y: this.vy * dt, z: vz * dt };
    this.controller.computeColliderMovement(this.collider, desired);
    const out = this.controller.computedMovement();
    if (this.controller.computedGrounded() && this.vy < 0) this.vy = 0;
    this.body.setNextKinematicTranslation({ x: pos.x + out.x, y: pos.y + out.y, z: pos.z + out.z });

    if (this.state === 'melee') {
      this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
      if (this.meleeCooldown === 0) {
        player.damage(this.meleeDamage, this.typeLabel);
        this.meleeCooldown = 1.0;
      }
    }
    if (this.state === 'shoot' || this.state === 'melee') {
      this.shootCooldown -= dt;
      if (this.shootCooldown <= 0 && los) {
        this.shoot(player);
        this.shootCooldown = this.fireInterval * (0.85 + Math.random() * 0.3);
      }
    } else {
      this.shootCooldown = Math.max(this.shootCooldown - dt, 0.2);
    }

    const newPos = this.body.translation();
    this.mesh.position.set(newPos.x, newPos.y - 0.85, newPos.z);
    if (this.state !== 'idle') this.mesh.rotation.y = Math.atan2(dx, dz);

    const moving = Math.hypot(vx, vz) > 0.2;
    this.walkAmt += ((moving ? 1 : 0) - this.walkAmt) * Math.min(1, dt * 6);
    if (moving) this.walkT += dt * 8;

    const swing = Math.sin(this.walkT) * 0.55 * this.walkAmt;
    const kneeL = Math.max(0, Math.sin(this.walkT + Math.PI / 2)) * 0.7 * this.walkAmt;
    const kneeR = Math.max(0, Math.sin(this.walkT - Math.PI / 2)) * 0.7 * this.walkAmt;
    this.rig.leftLeg.hip.rotation.x = swing;
    this.rig.rightLeg.hip.rotation.x = -swing;
    this.rig.leftLeg.knee.rotation.x = kneeL;
    this.rig.rightLeg.knee.rotation.x = kneeR;

    const aiming = this.state === 'shoot' || this.state === 'melee' || (this.state === 'chase' && dist < this.engageRange + 4);
    this.aimT += ((aiming ? 1 : 0) - this.aimT) * Math.min(1, dt * 8);

    // arm pose: idle swing → aim grip
    const idleR = { x: -swing * 0.6, y: 0, z: 0.05 };
    const idleL = { x: swing * 0.6, y: 0, z: -0.05 };
    this.rig.rightArm.shoulder.rotation.x = idleR.x * (1 - this.aimT) + POSE_AIM.rightShoulder.x * this.aimT;
    this.rig.rightArm.shoulder.rotation.y = POSE_AIM.rightShoulder.y * this.aimT;
    this.rig.rightArm.shoulder.rotation.z = idleR.z * (1 - this.aimT) + POSE_AIM.rightShoulder.z * this.aimT;
    this.rig.rightArm.elbow.rotation.x = POSE_AIM.rightElbow.x * this.aimT;

    this.rig.leftArm.shoulder.rotation.x = idleL.x * (1 - this.aimT) + POSE_AIM.leftShoulder.x * this.aimT;
    this.rig.leftArm.shoulder.rotation.y = POSE_AIM.leftShoulder.y * this.aimT;
    this.rig.leftArm.shoulder.rotation.z = idleL.z * (1 - this.aimT) + POSE_AIM.leftShoulder.z * this.aimT;
    this.rig.leftArm.elbow.rotation.x = POSE_AIM.leftElbow.x * this.aimT;

    // aim the gun at the player vertically
    const muzzleApprox = newPos.y + 1.27;
    const targetY = ppos.y + 0.3;
    const pitch = Math.atan2(targetY - muzzleApprox, Math.max(0.5, dist));
    this.aimPitch += (pitch * this.aimT - this.aimPitch) * Math.min(1, dt * 10);
    this.rig.aimMount.rotation.x = -this.aimPitch;

    // when not aiming, lower the gun toward hip
    const idleGunRot = (1 - this.aimT) * 0.9;
    this.rig.aimMount.rotation.x -= idleGunRot;
    this.rig.aimMount.position.set(
      0.06 + 0.08 * (1 - this.aimT),
      0.32 - 0.18 * (1 - this.aimT),
      -0.02
    );

    // head tracks the player when aware
    if (aiming && dist > 0.01) {
      const headPitch = Math.atan2(targetY - (newPos.y + 1.5), dist);
      this.rig.headGroup.rotation.x = -headPitch * 0.6;
      this.rig.torso.rotation.x = -pitch * 0.18 * this.aimT;
    } else {
      this.rig.headGroup.rotation.x *= 0.9;
      this.rig.torso.rotation.x *= 0.9;
    }

    this.breathT += dt * 1.8;
    this.rig.pelvis.position.y = 0.95 + Math.sin(this.walkT * 2) * 0.022 * this.walkAmt + Math.sin(this.breathT) * 0.008 * (1 - this.walkAmt);
    this.rig.torso.rotation.z = Math.sin(this.walkT) * 0.035 * this.walkAmt;

    this.flashIntensity += (0 - this.flashIntensity) * Math.min(1, dt * 22);
    this.rig.flashLight.intensity = this.flashIntensity;
    this.rig.flashMesh.material.opacity = Math.min(1, this.flashIntensity / 5);
  }

  dispose(scene, physics) {
    scene.remove(this.mesh);
    if (this.controller) physics.removeCharacterController(this.controller);
    if (this.body) physics.removeRigidBody(this.body);
  }
}
