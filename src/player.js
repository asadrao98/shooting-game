import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

const STAND_H = 1.7;
const CROUCH_H = 1.1;
const RADIUS = 0.35;
const EYE_OFFSET = 0.75;

export class Player {
  constructor(scene, physics, camera, spawn) {
    this.scene = scene;
    this.physics = physics;
    this.camera = camera;
    this.hp = 100;
    this.maxHp = 100;

    this.yaw = 0;
    this.pitch = 0;
    this.height = STAND_H;

    this.velocity = new THREE.Vector3();
    this.input = { f: 0, b: 0, l: 0, r: 0, jump: false, sprint: false, crouch: false, ads: false };
    this.onGround = false;
    this.jumpCooldown = 0;
    this.grenades = 3;
    this.grenadeCooldown = 0;
    this.stepDist = 0;
    this.sensitivity = 1.0;
    this.bobT = 0;
    this.bobAmt = 0;
    this.swayX = 0; this.swayY = 0;

    const halfH = (STAND_H - RADIUS * 2) / 2;
    const spawnY = spawn.y ?? STAND_H / 2;
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(spawn.x, spawnY, spawn.z);
    this.body = physics.createRigidBody(bodyDesc);
    this.collider = physics.createCollider(
      RAPIER.ColliderDesc.capsule(halfH, RADIUS),
      this.body
    );

    this.controller = physics.createCharacterController(0.02);
    this.controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
    this.controller.enableAutostep(0.4, 0.2, true);
    this.controller.enableSnapToGround(0.4);
    this.controller.setApplyImpulsesToDynamicBodies(true);

    this.bindInput();
  }

  bindInput() {
    this._kd = e => {
      if (e.code === 'KeyW') this.input.f = 1;
      if (e.code === 'KeyS') this.input.b = 1;
      if (e.code === 'KeyA') this.input.l = 1;
      if (e.code === 'KeyD') this.input.r = 1;
      if (e.code === 'Space') this.input.jump = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.input.sprint = true;
      if (e.code === 'KeyC') this.input.crouch = true;
      const locked = document.pointerLockElement === document.body;
      if (e.code === 'KeyR' && this.weapon && locked) this.weapon.reload();
      if (e.code === 'KeyG' && this.game && locked) this.game.throwGrenade();
      if (e.code === 'Digit1' && this.weapon && locked) this.weapon.switchTo('pistol');
      if (e.code === 'Digit2' && this.weapon && locked) this.weapon.switchTo('rifle');
      if (e.code === 'Digit3' && this.weapon && locked) this.weapon.switchTo('shotgun');
    };
    this._ku = e => {
      if (e.code === 'KeyW') this.input.f = 0;
      if (e.code === 'KeyS') this.input.b = 0;
      if (e.code === 'KeyA') this.input.l = 0;
      if (e.code === 'KeyD') this.input.r = 0;
      if (e.code === 'Space') this.input.jump = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.input.sprint = false;
      if (e.code === 'KeyC') this.input.crouch = false;
    };
    this._mm = e => {
      if (document.pointerLockElement !== document.body) return;
      const s = 0.0022 * this.sensitivity;
      this.yaw -= e.movementX * s;
      this.pitch -= e.movementY * s;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    };
    this._click = () => {
      if (window.IS_TOUCH) return;
      if (document.pointerLockElement !== document.body) document.body.requestPointerLock();
    };
    this._md = e => {
      if (e.button === 2) this.input.ads = true;
    };
    this._mu = e => {
      if (e.button === 2) this.input.ads = false;
    };
    this._ctx = e => e.preventDefault();

    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    window.addEventListener('mousemove', this._mm);
    window.addEventListener('mousedown', this._md);
    window.addEventListener('mouseup', this._mu);
    document.body.addEventListener('click', this._click);
    window.addEventListener('contextmenu', this._ctx);
  }

  damage(amount, source) {
    this.hp = Math.max(0, this.hp - amount);
    this.lastDamageSource = source || this.lastDamageSource;
    const dmg = document.getElementById('damage');
    if (dmg) {
      dmg.style.opacity = '1';
      clearTimeout(this._dmgT);
      this._dmgT = setTimeout(() => { dmg.style.opacity = '0'; }, 140);
    }
    if (this.game) this.game.shake(0.04 + amount * 0.002);
  }

  update(dt) {
    const crouching = this.input.crouch;
    const targetHeight = crouching ? CROUCH_H : STAND_H;
    this.height += (targetHeight - this.height) * Math.min(1, dt * 12);

    const baseSpeed = crouching ? 2.4 : (this.input.sprint && this.input.f > 0 ? 6.8 : 4.4);
    const speed = this.input.ads ? baseSpeed * 0.55 : baseSpeed;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    wish.addScaledVector(forward, this.input.f - this.input.b);
    wish.addScaledVector(right, this.input.r - this.input.l);
    const wishMag = wish.length();
    if (wishMag > 0) {
      // analog-aware: joystick mag < 1 reduces speed, keyboard diagonal normalizes to 1
      const cap = Math.min(1, wishMag);
      wish.divideScalar(wishMag).multiplyScalar(speed * cap);
    }

    const accel = this.onGround ? 18 : 5;
    this.velocity.x += (wish.x - this.velocity.x) * Math.min(1, accel * dt);
    this.velocity.z += (wish.z - this.velocity.z) * Math.min(1, accel * dt);

    this.velocity.y -= 24 * dt;

    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.grenadeCooldown = Math.max(0, this.grenadeCooldown - dt);
    if (this.input.jump && this.onGround && this.jumpCooldown === 0) {
      this.velocity.y = 7.8;
      this.jumpCooldown = 0.25;
      this.onGround = false;
    }

    const desired = { x: this.velocity.x * dt, y: this.velocity.y * dt, z: this.velocity.z * dt };
    this.controller.computeColliderMovement(this.collider, desired);
    const out = this.controller.computedMovement();
    this.onGround = this.controller.computedGrounded();
    if (this.onGround && this.velocity.y < 0) this.velocity.y = 0;

    const pos = this.body.translation();
    this.body.setNextKinematicTranslation({ x: pos.x + out.x, y: pos.y + out.y, z: pos.z + out.z });

    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = hSpeed > 0.5 && this.onGround;

    // footsteps — accumulate distance, trigger sound per step
    if (moving) {
      this.stepDist += hSpeed * dt;
      const threshold = this.input.sprint ? 2.0 : (crouching ? 3.2 : 2.6);
      if (this.stepDist > threshold) {
        this.stepDist = 0;
        if (this.game && this.game.audio) this.game.audio.playFootstep();
      }
    } else {
      this.stepDist = 0;
    }

    const bobTarget = moving ? (this.input.sprint ? 0.085 : 0.05) : 0;
    this.bobAmt += (bobTarget - this.bobAmt) * Math.min(1, dt * 8);
    if (moving) this.bobT += dt * (this.input.sprint ? 11 : 8);
    const bobY = Math.sin(this.bobT * 2) * this.bobAmt;
    const bobX = Math.cos(this.bobT) * this.bobAmt * 0.6;

    const swayTargetX = (this.input.r - this.input.l) * -0.012;
    const swayTargetY = this.velocity.y * 0.0015;
    this.swayX += (swayTargetX - this.swayX) * Math.min(1, dt * 6);
    this.swayY += (swayTargetY - this.swayY) * Math.min(1, dt * 6);

    const eyeY = pos.y + (this.height - STAND_H) * 0.5 + EYE_OFFSET + bobY;
    this.camera.position.set(pos.x + bobX * 0.05, eyeY, pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + this.swayX;
    this.camera.rotation.x = this.pitch + this.swayY;
    this.camera.rotation.z = -this.swayX * 0.5;

    const fovTarget = this.input.ads ? 55 : (this.input.sprint && moving ? 84 : 75);
    this.camera.fov += (fovTarget - this.camera.fov) * Math.min(1, dt * 10);
    this.camera.updateProjectionMatrix();
  }

  dispose(scene, physics) {
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    window.removeEventListener('mousemove', this._mm);
    window.removeEventListener('mousedown', this._md);
    window.removeEventListener('mouseup', this._mu);
    document.body.removeEventListener('click', this._click);
    window.removeEventListener('contextmenu', this._ctx);
    physics.removeCharacterController(this.controller);
    physics.removeRigidBody(this.body);
  }
}
