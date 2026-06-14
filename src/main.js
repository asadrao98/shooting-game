import RAPIER from '@dimforge/rapier3d-compat';
import { Game } from './game.js';

await RAPIER.init();

window.IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
if (window.IS_TOUCH) document.body.classList.add('mobile');

const game = new Game();
window.game = game;

document.querySelectorAll('#menu button[data-diff]').forEach(btn => {
  btn.addEventListener('click', () => {
    const diff = btn.dataset.diff;
    const env = document.getElementById('env').value;
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    if (window.IS_TOUCH) {
      document.getElementById('mobileControls').classList.remove('hidden');
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    }
    game.start(diff, env);
  });
});

document.getElementById('resumeBtn').addEventListener('click', () => game.resumeGame());
document.getElementById('restartBtn').addEventListener('click', () => game.restartStage());
document.getElementById('quitBtn').addEventListener('click', () => game.quitToMenu());

// Settings panel
const settingsEl = document.getElementById('settings');
const sSens = document.getElementById('setSens');
const sFov = document.getElementById('setFov');
const sVol = document.getElementById('setVol');
const sSensV = document.getElementById('setSensVal');
const sFovV = document.getElementById('setFovVal');
const sVolV = document.getElementById('setVolVal');

const setGyro = document.getElementById('setGyro');
const setGyroSens = document.getElementById('setGyroSens');
const setGyroInvert = document.getElementById('setGyroInvert');
const setGyroSensVal = document.getElementById('setGyroSensVal');
const setBtnScale = document.getElementById('setBtnScale');
const setBtnScaleVal = document.getElementById('setBtnScaleVal');

function refreshSettingsUI() {
  sSens.value = game.settings.sensitivity;
  sFov.value = game.settings.fov;
  sVol.value = game.settings.volume;
  sSensV.textContent = (+sSens.value).toFixed(2);
  sFovV.textContent = sFov.value;
  sVolV.textContent = Math.round(+sVol.value * 100);
  setGyro.checked = !!game.settings.gyroEnabled;
  setGyroSens.value = game.settings.gyroSensitivity || 1;
  setGyroSensVal.textContent = (+setGyroSens.value).toFixed(2);
  setGyroInvert.checked = !!game.settings.gyroInvertY;
  setBtnScale.value = game.settings.buttonScale || 1;
  setBtnScaleVal.textContent = (+setBtnScale.value).toFixed(2);
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  refreshSettingsUI();
  settingsEl.classList.remove('hidden');
});
document.getElementById('pauseSettingsBtn').addEventListener('click', () => {
  refreshSettingsUI();
  settingsEl.classList.remove('hidden');
});
document.getElementById('settingsBack').addEventListener('click', () => {
  settingsEl.classList.add('hidden');
});
sSens.addEventListener('input', () => {
  game.settings.sensitivity = +sSens.value;
  sSensV.textContent = game.settings.sensitivity.toFixed(2);
  game.applySettings();
  game.saveSettings();
});
sFov.addEventListener('input', () => {
  game.settings.fov = +sFov.value;
  sFovV.textContent = sFov.value;
  game.applySettings();
  game.saveSettings();
});
sVol.addEventListener('input', () => {
  game.settings.volume = +sVol.value;
  sVolV.textContent = Math.round(game.settings.volume * 100);
  game.applySettings();
  game.saveSettings();
});

// ============ BUTTON LAYOUT CUSTOMIZATION (mobile) ============
const BUTTON_DEFAULTS = {
  btnShoot:   { width: 96, anchor: 'br', right: 24, bottom: 24 },
  btnAds:     { width: 74, anchor: 'br', right: 130, bottom: 56 },
  btnJump:    { width: 68, anchor: 'br', right: 24, bottom: 132 },
  btnCrouch:  { width: 58, anchor: 'br', right: 124, bottom: 140 },
  btnReload:  { width: 52, anchor: 'br', right: 24, bottom: 212 },
  btnGrenade: { width: 52, anchor: 'br', right: 86, bottom: 218 },
  btnPause:   { width: 42, anchor: 'tl', left: 24, top: 24 },
  joystick:   { width: 140, anchor: 'bl', left: 28, bottom: 28 },
};

function applyButtonScale(scale) {
  for (const [id, def] of Object.entries(BUTTON_DEFAULTS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const size = Math.round(def.width * scale);
    el.style.width = size + 'px';
    el.style.height = size + 'px';
  }
  // resize joystick knob proportionally
  const knob = document.getElementById('joystickKnob');
  if (knob) {
    const ks = Math.round(60 * scale);
    knob.style.width = ks + 'px';
    knob.style.height = ks + 'px';
    knob.style.margin = `${-ks / 2}px 0 0 ${-ks / 2}px`;
  }
}

function applyButtonLayout(layout) {
  for (const id of Object.keys(BUTTON_DEFAULTS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const custom = (layout || {})[id];
    if (!custom) continue;
    ['right', 'bottom', 'left', 'top'].forEach(k => {
      if (custom[k] !== undefined) el.style[k] = custom[k] + 'px';
    });
  }
}

function resetButtonLayout() {
  for (const id of Object.keys(BUTTON_DEFAULTS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.style.right = '';
    el.style.bottom = '';
    el.style.top = '';
    el.style.left = '';
  }
  game.settings.buttonLayout = {};
  game.settings.buttonScale = 1.0;
  applyButtonScale(1.0);
  game.saveSettings();
}

let editMode = false;
function enterEditMode() {
  if (editMode) return;
  editMode = true;
  document.body.classList.add('editLayout');
  document.getElementById('editLayoutOverlay').classList.remove('hidden');
  settingsEl.classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
}
function exitEditMode() {
  if (!editMode) return;
  editMode = false;
  document.body.classList.remove('editLayout');
  document.getElementById('editLayoutOverlay').classList.add('hidden');
  game.saveSettings();
}

function makeDraggable(id) {
  const el = document.getElementById(id);
  if (!el) return;
  let dragging = false;
  let startTouch = null;
  let startStyle = null;
  const def = BUTTON_DEFAULTS[id];

  el.addEventListener('touchstart', e => {
    if (!editMode) return;
    const t = e.touches[0];
    dragging = true;
    startTouch = { x: t.clientX, y: t.clientY };
    const cs = window.getComputedStyle(el);
    startStyle = {
      right: parseFloat(cs.right) || 0,
      bottom: parseFloat(cs.bottom) || 0,
      left: parseFloat(cs.left) || 0,
      top: parseFloat(cs.top) || 0,
    };
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true, passive: false });

  el.addEventListener('touchmove', e => {
    if (!dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - startTouch.x;
    const dy = t.clientY - startTouch.y;
    const W = window.innerWidth, H = window.innerHeight;
    const w = el.offsetWidth, h = el.offsetHeight;

    if (def.anchor === 'br') {
      const r = Math.max(0, Math.min(W - w, startStyle.right - dx));
      const b = Math.max(0, Math.min(H - h, startStyle.bottom - dy));
      el.style.right = r + 'px'; el.style.bottom = b + 'px';
    } else if (def.anchor === 'bl') {
      const l = Math.max(0, Math.min(W - w, startStyle.left + dx));
      const b = Math.max(0, Math.min(H - h, startStyle.bottom - dy));
      el.style.left = l + 'px'; el.style.bottom = b + 'px';
    } else if (def.anchor === 'tl') {
      const l = Math.max(0, Math.min(W - w, startStyle.left + dx));
      const tp = Math.max(0, Math.min(H - h, startStyle.top + dy));
      el.style.left = l + 'px'; el.style.top = tp + 'px';
    }
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true, passive: false });

  const finish = e => {
    if (!dragging) return;
    dragging = false;
    if (!game.settings.buttonLayout) game.settings.buttonLayout = {};
    const layout = {};
    if (def.anchor === 'br') {
      layout.right = parseFloat(el.style.right);
      layout.bottom = parseFloat(el.style.bottom);
    } else if (def.anchor === 'bl') {
      layout.left = parseFloat(el.style.left);
      layout.bottom = parseFloat(el.style.bottom);
    } else if (def.anchor === 'tl') {
      layout.left = parseFloat(el.style.left);
      layout.top = parseFloat(el.style.top);
    }
    game.settings.buttonLayout[id] = layout;
    if (e) { e.preventDefault(); e.stopPropagation(); }
  };
  el.addEventListener('touchend', finish, { capture: true });
  el.addEventListener('touchcancel', finish, { capture: true });
}

if (window.IS_TOUCH) {
  applyButtonScale(game.settings.buttonScale || 1);
  applyButtonLayout(game.settings.buttonLayout);
  for (const id of Object.keys(BUTTON_DEFAULTS)) makeDraggable(id);
}

setBtnScale.addEventListener('input', () => {
  const scale = +setBtnScale.value;
  game.settings.buttonScale = scale;
  setBtnScaleVal.textContent = scale.toFixed(2);
  applyButtonScale(scale);
  game.saveSettings();
});
document.getElementById('editLayoutBtn').addEventListener('click', enterEditMode);
document.getElementById('editLayoutDone').addEventListener('click', exitEditMode);
document.getElementById('resetLayoutBtn').addEventListener('click', () => {
  resetButtonLayout();
  refreshSettingsUI();
});

// ============ GYRO AIM (mobile) ============
let gyroActive = false;
let gyroLast = null;
let gyroPermissionGranted = false;

async function requestGyroPermission() {
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  if (typeof DeviceOrientationEvent.requestPermission !== 'function') return true;
  try {
    const res = await DeviceOrientationEvent.requestPermission();
    return res === 'granted';
  } catch { return false; }
}

function onDeviceOrientation(e) {
  if (!game.settings.gyroEnabled) return;
  if (!game.player || game.paused || game.transitioning) return;
  if (e.beta === null || e.gamma === null) return;
  if (gyroLast === null) { gyroLast = { beta: e.beta, gamma: e.gamma }; return; }

  let dBeta = e.beta - gyroLast.beta;
  let dGamma = e.gamma - gyroLast.gamma;
  // wrap-around safety
  if (dBeta > 90) dBeta -= 360;
  else if (dBeta < -90) dBeta += 360;
  if (dGamma > 90) dGamma -= 180;
  else if (dGamma < -90) dGamma += 180;
  gyroLast = { beta: e.beta, gamma: e.gamma };

  const s = (game.settings.gyroSensitivity || 1) * 0.012;
  const orient = (screen.orientation && screen.orientation.angle) || 0;
  // map device delta to camera deltas based on screen orientation
  // landscape-right (90): yaw <- gamma, pitch <- beta
  // landscape-left (270 or -90): yaw <- -gamma, pitch <- -beta
  // portrait (0): yaw <- gamma, pitch <- beta (rotated, but game expects landscape)
  let yawDelta = -dGamma;
  let pitchDelta = -dBeta;
  if (orient === 270 || orient === -90) { yawDelta = dGamma; pitchDelta = dBeta; }
  if (game.settings.gyroInvertY) pitchDelta = -pitchDelta;

  game.player.yaw += yawDelta * s;
  game.player.pitch += pitchDelta * s;
  game.player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, game.player.pitch));
}

async function setGyroState(enabled) {
  if (enabled && !gyroActive) {
    if (!gyroPermissionGranted) {
      gyroPermissionGranted = await requestGyroPermission();
      if (!gyroPermissionGranted) return false;
    }
    window.addEventListener('deviceorientation', onDeviceOrientation);
    gyroActive = true;
    gyroLast = null;
  } else if (!enabled && gyroActive) {
    window.removeEventListener('deviceorientation', onDeviceOrientation);
    gyroActive = false;
    gyroLast = null;
  }
  return true;
}

setGyro.addEventListener('change', async () => {
  if (setGyro.checked) {
    const ok = await setGyroState(true);
    if (!ok) {
      setGyro.checked = false;
      game.settings.gyroEnabled = false;
      alert('Gyroscope permission denied or unavailable.');
    } else {
      game.settings.gyroEnabled = true;
    }
  } else {
    setGyroState(false);
    game.settings.gyroEnabled = false;
  }
  game.saveSettings();
});

setGyroSens.addEventListener('input', () => {
  game.settings.gyroSensitivity = +setGyroSens.value;
  setGyroSensVal.textContent = game.settings.gyroSensitivity.toFixed(2);
  game.saveSettings();
});

setGyroInvert.addEventListener('change', () => {
  game.settings.gyroInvertY = setGyroInvert.checked;
  game.saveSettings();
});

// On Android (no requestPermission), auto-attach if previously enabled
if (window.IS_TOUCH && game.settings.gyroEnabled && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
  setGyroState(true);
}

// ============ MOBILE TOUCH CONTROLS ============
if (window.IS_TOUCH) {
  const joyEl = document.getElementById('joystick');
  const knob = document.getElementById('joystickKnob');
  const lookEl = document.getElementById('touchLook');
  let joyId = null, joyCenter = { x: 0, y: 0 };
  let joyVec = { x: 0, y: 0 };
  let lookId = null, lookLast = { x: 0, y: 0 };
  const JOY_RADIUS = 56;

  function updateKnob(dx, dy) {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  joyEl.addEventListener('touchstart', e => {
    if (joyId !== null) return;
    const t = e.changedTouches[0];
    joyId = t.identifier;
    const r = joyEl.getBoundingClientRect();
    joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    handleJoy(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });
  joyEl.addEventListener('touchmove', e => {
    for (const t of e.touches) {
      if (t.identifier === joyId) {
        handleJoy(t.clientX, t.clientY);
        e.preventDefault();
        break;
      }
    }
  }, { passive: false });
  function endJoy(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        joyId = null;
        joyVec = { x: 0, y: 0 };
        updateKnob(0, 0);
        return;
      }
    }
  }
  joyEl.addEventListener('touchend', endJoy);
  joyEl.addEventListener('touchcancel', endJoy);

  function handleJoy(x, y) {
    let dx = x - joyCenter.x;
    let dy = y - joyCenter.y;
    const len = Math.hypot(dx, dy);
    if (len > JOY_RADIUS) { dx = dx / len * JOY_RADIUS; dy = dy / len * JOY_RADIUS; }
    joyVec = { x: dx / JOY_RADIUS, y: dy / JOY_RADIUS };
    updateKnob(dx, dy);
  }

  // Look drag — anywhere on the right-side area not covered by a button
  lookEl.addEventListener('touchstart', e => {
    if (lookId !== null) return;
    const t = e.changedTouches[0];
    lookId = t.identifier;
    lookLast = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  }, { passive: false });
  lookEl.addEventListener('touchmove', e => {
    for (const t of e.touches) {
      if (t.identifier === lookId) {
        const dx = t.clientX - lookLast.x;
        const dy = t.clientY - lookLast.y;
        lookLast = { x: t.clientX, y: t.clientY };
        if (game.player) {
          const s = 0.005 * (game.settings.sensitivity || 1);
          game.player.yaw -= dx * s;
          game.player.pitch -= dy * s;
          game.player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, game.player.pitch));
        }
        e.preventDefault();
        return;
      }
    }
  }, { passive: false });
  function endLook(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === lookId) { lookId = null; return; }
    }
  }
  lookEl.addEventListener('touchend', endLook);
  lookEl.addEventListener('touchcancel', endLook);

  // Apply joystick to player input each frame; sprint auto when fully extended
  function pumpInput() {
    if (game.player) {
      const p = game.player.input;
      p.f = Math.max(0, -joyVec.y);
      p.b = Math.max(0, joyVec.y);
      p.l = Math.max(0, -joyVec.x);
      p.r = Math.max(0, joyVec.x);
      const mag = Math.hypot(joyVec.x, joyVec.y);
      p.sprint = mag > 0.88 && p.f > p.b; // sprint only when pushing mostly forward
    }
    requestAnimationFrame(pumpInput);
  }
  requestAnimationFrame(pumpInput);

  function bindHoldButton(el, onDown, onUp) {
    let pressed = false;
    const down = e => { if (!pressed) { pressed = true; el.classList.add('pressed'); onDown(); } e.preventDefault(); };
    const up = e => { if (pressed) { pressed = false; el.classList.remove('pressed'); if (onUp) onUp(); } if (e) e.preventDefault(); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up);
    el.addEventListener('touchcancel', up);
  }
  function bindTapButton(el, action) {
    el.addEventListener('touchstart', e => { action(); el.classList.add('pressed'); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', e => { el.classList.remove('pressed'); e.preventDefault(); });
    el.addEventListener('touchcancel', () => el.classList.remove('pressed'));
  }

  bindHoldButton(document.getElementById('btnShoot'),
    () => { if (game.weapon) game.weapon.firing = true; },
    () => { if (game.weapon) game.weapon.firing = false; }
  );
  bindHoldButton(document.getElementById('btnAds'),
    () => { if (game.player) game.player.input.ads = true; },
    () => { if (game.player) game.player.input.ads = false; }
  );
  bindHoldButton(document.getElementById('btnJump'),
    () => { if (game.player) game.player.input.jump = true; },
    () => { if (game.player) game.player.input.jump = false; }
  );
  bindHoldButton(document.getElementById('btnCrouch'),
    () => { if (game.player) game.player.input.crouch = true; },
    () => { if (game.player) game.player.input.crouch = false; }
  );
  bindTapButton(document.getElementById('btnReload'), () => game.weapon && game.weapon.reload());
  bindTapButton(document.getElementById('btnGrenade'), () => game.throwGrenade());
  bindTapButton(document.getElementById('btnPause'), () => game.pause());

  document.querySelectorAll('#weaponSwitch .wbtn').forEach(btn => {
    btn.addEventListener('touchstart', e => {
      if (game.weapon) {
        game.weapon.switchTo(btn.dataset.w);
        document.querySelectorAll('#weaponSwitch .wbtn').forEach(b => b.classList.toggle('active', b === btn));
      }
      e.preventDefault();
    }, { passive: false });
  });

  // Hide mobile controls when paused
  const pauseEl = document.getElementById('pause');
  const obs = new MutationObserver(() => {
    const paused = !pauseEl.classList.contains('hidden');
    document.getElementById('mobileControls').style.display = paused ? 'none' : '';
  });
  obs.observe(pauseEl, { attributes: true, attributeFilter: ['class'] });
}
