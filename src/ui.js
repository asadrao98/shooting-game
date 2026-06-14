export class HUD {
  constructor() {
    this.hp = document.getElementById('hp');
    this.ammo = document.getElementById('ammo');
    this.enemies = document.getElementById('enemies');
    this.lives = document.getElementById('lives');
    this.grenades = document.getElementById('grenades');
    this.levelInfo = document.getElementById('levelInfo');
    this.weaponName = document.getElementById('weaponName');
    this.score = document.getElementById('score');
    this.killFeed = document.getElementById('killFeed');
    this.minimap = document.getElementById('minimap');
    this.mmCtx = this.minimap ? this.minimap.getContext('2d') : null;
    this.mmSize = this.minimap ? this.minimap.width : 170;
    this.mmRange = 26; // world half-extent shown
  }

  setLevel(text) { this.levelInfo.textContent = text; }

  update(game) {
    const player = game.player;
    const weapon = game.weapon;
    if (!player || !weapon) return;

    this.hp.textContent = Math.ceil(player.hp);
    this.hp.style.color = player.hp < 35 ? '#ff5050' : (player.hp < 65 ? '#ffc850' : '#fff');
    const reloadTag = weapon.reloading > 0 ? ' ···' : '';
    this.ammo.textContent = `${weapon.mag} / ${weapon.reserve}${reloadTag}`;
    this.enemies.textContent = game.enemies.length;
    if (this.lives) {
      const n = Math.max(0, game.lives ?? 0);
      this.lives.textContent = '●'.repeat(n) + '○'.repeat(Math.max(0, 3 - n));
    }
    if (this.grenades) this.grenades.textContent = player.grenades ?? 0;
    if (this.weaponName && weapon.current) this.weaponName.textContent = weapon.current.name;
    if (this.score) {
      const score = (game.runStats.kills * 100) + (game.runStats.headshots * 50);
      this.score.textContent = score.toLocaleString();
    }
    this.drawKillFeed(game);
    this.drawMinimap(game);
  }

  drawKillFeed(game) {
    if (!this.killFeed) return;
    const now = performance.now();
    const html = game.killFeed.map(k => {
      const age = (now - k.t) / 1000;
      const opacity = age > 3 ? Math.max(0, 1 - (age - 3)) : 1;
      const tag = k.headshot ? '<span class="hs">HEADSHOT</span>' : '';
      return `<div class="kf" style="opacity:${opacity.toFixed(2)}">YOU &rsaquo; ${k.type.toUpperCase()} ${tag}</div>`;
    }).join('');
    if (this._lastFeedHtml !== html) {
      this.killFeed.innerHTML = html;
      this._lastFeedHtml = html;
    }
  }

  drawMinimap(game) {
    const ctx = this.mmCtx;
    if (!ctx) return;
    const size = this.mmSize;
    const scale = (size / 2) / this.mmRange;
    const player = game.player;
    const ppos = player.body.translation();

    ctx.clearRect(0, 0, size, size);

    // background disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(8,12,18,0.78)';
    ctx.fillRect(0, 0, size, size);

    // rotated world overlay
    ctx.translate(size / 2, size / 2);
    ctx.rotate(player.yaw);

    const def = game.world && game.world.def;
    if (def && def.walls) {
      ctx.fillStyle = 'rgba(170,178,188,0.85)';
      for (const w of def.walls) {
        const [wx, , wz, ww, , wd] = w;
        const rx = (wx - ppos.x) * scale;
        const rz = (wz - ppos.z) * scale;
        ctx.fillRect(rx - ww * scale / 2, rz - wd * scale / 2, ww * scale, wd * scale);
      }
    }
    if (def && def.floors) {
      ctx.strokeStyle = 'rgba(140,160,180,0.45)';
      ctx.lineWidth = 1;
      for (const f of def.floors) {
        const [fx, , fz, fw, fd] = f;
        const rx = (fx - ppos.x) * scale;
        const rz = (fz - ppos.z) * scale;
        ctx.strokeRect(rx - fw * scale / 2, rz - fd * scale / 2, fw * scale, fd * scale);
      }
    }

    // explosive barrels (yellow square)
    if (game.barrels) {
      ctx.fillStyle = '#ffd040';
      for (const b of game.barrels) {
        if (b.exploded) continue;
        const rx = (b.x - ppos.x) * scale;
        const rz = (b.z - ppos.z) * scale;
        ctx.fillRect(rx - 2, rz - 2, 4, 4);
      }
    }

    // enemies (red dots, brighter outline if hit recently)
    for (const e of game.enemies) {
      if (e.dead) continue;
      const ep = e.body.translation();
      const rx = (ep.x - ppos.x) * scale;
      const rz = (ep.z - ppos.z) * scale;
      ctx.fillStyle = '#ff3838';
      ctx.beginPath();
      ctx.arc(rx, rz, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,80,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rx, rz, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // player arrow at center (always points up)
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.fillStyle = '#9cd8ff';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // sight cone
    ctx.fillStyle = 'rgba(156,216,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, size * 0.42, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // outer ring
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
