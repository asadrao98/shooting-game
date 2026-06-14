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
