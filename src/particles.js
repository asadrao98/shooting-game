import * as THREE from 'three';

export class ParticleField {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    const count = config.count;
    const area = config.area;

    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area.x;
      positions[i * 3 + 1] = Math.random() * area.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * area.z;
      speeds[i] = config.speed * (0.7 + Math.random() * 0.6);
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.positions = positions;
    this.speeds = speeds;
    this.phases = phases;

    const mat = new THREE.PointsMaterial({
      color: config.color ?? 0xffffff,
      size: config.size ?? 0.3,
      transparent: true,
      opacity: config.opacity ?? 0.7,
      depthWrite: false,
      map: config.texture ?? null,
      blending: config.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geom, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.material = mat;
    this.area = area;
    this.sway = config.sway || 0;
    this.fall = config.fall ?? 'straight';
    this.t = 0;
    this.followTarget = null;
  }

  follow(target) { this.followTarget = target; }

  update(dt) {
    this.t += dt;
    const pos = this.positions;
    const speeds = this.speeds;
    const phases = this.phases;
    const a = this.area;
    const n = pos.length / 3;
    for (let i = 0; i < n; i++) {
      pos[i * 3 + 1] -= speeds[i] * dt;
      if (this.sway > 0) {
        const s = Math.sin(this.t * 1.5 + phases[i]) * this.sway;
        pos[i * 3] += s * dt;
        if (this.fall === 'drift') {
          pos[i * 3 + 2] += Math.cos(this.t * 1.2 + phases[i]) * this.sway * 0.7 * dt;
        }
      }
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = a.y;
        pos[i * 3] = (Math.random() - 0.5) * a.x;
        pos[i * 3 + 2] = (Math.random() - 0.5) * a.z;
      }
      const hx = a.x / 2, hz = a.z / 2;
      if (pos[i * 3] > hx) pos[i * 3] -= a.x;
      else if (pos[i * 3] < -hx) pos[i * 3] += a.x;
      if (pos[i * 3 + 2] > hz) pos[i * 3 + 2] -= a.z;
      else if (pos[i * 3 + 2] < -hz) pos[i * 3 + 2] += a.z;
    }
    this.points.geometry.attributes.position.needsUpdate = true;

    if (this.followTarget) {
      const t = this.followTarget;
      this.points.position.x = t.x;
      this.points.position.z = t.z;
    }
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
