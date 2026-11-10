/* Glow – a tiny, dependency-free Home Assistant remote for bedroom Hue lights.
 * Talks to Home Assistant over its WebSocket API using a long-lived token that
 * is stored only in this browser (localStorage). Includes a demo mode. */
'use strict';

const VERSION = '1.5.0';

// ───────────────────────── Entity IDs (match the HA package) ─────────────────────────
const DEFAULT_GROUPS = {
  all: 'light.bedroom_all_lights',
  lamps: 'light.bedside_lamps',
  downs: 'light.downlights',
};
const IDS = {
  period: 'sensor.bedroom_light_period',
  daytime: 'binary_sensor.bedroom_is_daytime',
  phone: 'binary_sensor.bedroom_phone_charging',
  partnerPhone: 'binary_sensor.bedroom_partner_phone_charging',
  bothPhones: 'input_boolean.bedroom_wait_for_both_phones',
  sleep: 'input_boolean.bedroom_sleep_mode',
  autoGoodnight: 'input_boolean.bedroom_auto_goodnight',
  softStart: 'input_boolean.bedroom_night_soft_start',
  lockout: 'input_boolean.bedroom_daytime_lockout',
  wake: 'input_boolean.bedroom_wake_light',
  wakeWeekdays: 'input_boolean.bedroom_wake_weekdays_only',
  awayOff: 'input_boolean.bedroom_away_off',
  bedtime: 'input_datetime.bedroom_bedtime',
  wakeTime: 'input_datetime.bedroom_wake_time',
  goodnightFade: 'input_number.bedroom_goodnight_fade_min',
  nightBrightness: 'input_number.bedroom_night_brightness',
  wakeFade: 'input_number.bedroom_wake_fade_min',
  override: 'timer.bedroom_daylight_override',
  goodnight: 'script.bedroom_goodnight',
  allOff: 'script.bedroom_all_off',
  wakeUp: 'script.bedroom_wake_up',
  unlock: 'script.bedroom_daylight_unlock',
  sleepTimer: 'timer.bedroom_sleep_timer',
  sleepTimerScript: 'script.bedroom_sleep_timer',
  windDown: 'input_boolean.bedroom_wind_down',
  sunsetWelcome: 'input_boolean.bedroom_sunset_welcome',
  lastScene: 'input_text.bedroom_last_scene',
  inBedScript: 'script.bedroom_in_bed',
  meInBed: 'input_boolean.bedroom_me_in_bed',
  partnerInBed: 'input_boolean.bedroom_partner_in_bed',
  waiting: 'input_boolean.bedroom_waiting_for_partner',
};

// Scenes: `demo` describes what the scene does so demo mode can fake it.
// Keys: L1/L2 = bedside lamps, D1/D2 = downlights. b = brightness %, k = kelvin, rgb = colour.
// Warm and colourful only – no cool/blue-white light (matches the HA package).
const c = (b, rgb) => ({ b, rgb });
const w = (b, k) => ({ b, k });
const SCENES = [
  { key: 'golden', name: 'Golden', emoji: '🌟', bg: 'linear-gradient(135deg,#ffd36b,#ff9f1c)',
    demo: { L1: c(100, [255, 170, 60]), L2: c(100, [255, 170, 60]), D1: w(100, 2400), D2: w(100, 2400) } },
  { key: 'citrus', name: 'Citrus', emoji: '🍊', bg: 'linear-gradient(135deg,#ffc93c,#ff6a00)',
    demo: { L1: c(100, [255, 120, 0]), L2: c(100, [255, 150, 20]), D1: w(90, 2400), D2: w(90, 2400) } },
  { key: 'read', name: 'Read', emoji: '📖', bg: 'linear-gradient(135deg,#ffe0a8,#d9944f)',
    demo: { L1: w(85, 2700), L2: w(85, 2700), D1: w(30, 2400), D2: w(30, 2400) } },
  { key: 'relax', name: 'Relax', emoji: '🛋️', bg: 'linear-gradient(135deg,#ffb38a,#e0603a)',
    demo: { L1: w(55, 2200), L2: w(55, 2200), D1: w(45, 2200), D2: w(45, 2200) } },
  { key: 'movie', name: 'Movie', emoji: '🎬', bg: 'linear-gradient(135deg,#5a3d2b,#1e1424)',
    demo: { L1: w(20, 2200), L2: w(20, 2200), D1: null, D2: null } },
  { key: 'sunset', name: 'Sunset', emoji: '🌅', bg: 'linear-gradient(135deg,#ff8a3d,#ff4f8b)',
    demo: { L1: c(70, [255, 120, 40]), L2: c(70, [255, 70, 110]), D1: w(30, 2200), D2: w(30, 2200) } },
  { key: 'rose', name: 'Rose', emoji: '🌸', bg: 'linear-gradient(135deg,#ff9ac8,#e8418b)',
    demo: { L1: c(60, [255, 90, 150]), L2: c(60, [255, 120, 170]), D1: w(35, 2200), D2: w(35, 2200) } },
  { key: 'ocean', name: 'Ocean', emoji: '🌊', bg: 'linear-gradient(135deg,#2ee6d6,#1f6fff)',
    demo: { L1: c(50, [0, 180, 255]), L2: c(50, [0, 220, 200]), D1: w(30, 2200), D2: w(30, 2200) } },
  { key: 'aurora', name: 'Aurora', emoji: '💚', bg: 'linear-gradient(135deg,#3cffa0,#8c50ff)',
    demo: { L1: c(55, [60, 255, 140]), L2: c(55, [140, 80, 255]), D1: w(30, 2200), D2: w(30, 2200) } },
  { key: 'galaxy', name: 'Galaxy', emoji: '🌌', bg: 'linear-gradient(135deg,#8c3cff,#2864ff)',
    demo: { L1: c(55, [140, 60, 255]), L2: c(55, [40, 110, 255]), D1: w(20, 2200), D2: w(20, 2200) } },
  { key: 'lavender', name: 'Lavender', emoji: '💜', bg: 'linear-gradient(135deg,#d6b8ff,#9a6bff)',
    demo: { L1: c(55, [190, 140, 255]), L2: c(55, [210, 160, 255]), D1: w(35, 2200), D2: w(35, 2200) } },
  { key: 'nightlight', name: 'Nightlight', emoji: '🕯️', bg: 'linear-gradient(135deg,#3a2414,#120c1c)',
    demo: { L1: c(3, [255, 90, 20]), L2: c(3, [255, 90, 20]), D1: null, D2: null } },
];
const sceneEntity = (key) => `script.bedroom_scene_${key}`;

const COLOUR_SWATCHES = [
  [255, 70, 50], [255, 120, 0], [255, 170, 60], [255, 140, 90], [255, 90, 150], [255, 60, 120],
  [210, 160, 255], [150, 70, 255], [60, 100, 255], [0, 200, 220], [60, 255, 140], [255, 210, 80],
];
// No cool/blue-white: the warmth slider stops at warm white.
const MAX_KELVIN = 3000;

// ───────────────────────── Storage helpers ─────────────────────────
const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem('glow.' + key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem('glow.' + key, JSON.stringify(value)); } catch { /* private mode */ } },
  clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('glow.')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ } },
};

// ───────────────────────── Home Assistant WebSocket backend ─────────────────────────
class HABackend {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.kind = 'ha';
    this.id = 1;
    this.pending = new Map();
    this.onState = () => {};
    this.onStatus = () => {};
    this.closedByUs = false;
    this.retry = 0;
  }

  wsUrl() { return this.url.replace(/^http/i, 'ws') + '/api/websocket'; }

  connect() {
    this.closedByUs = false;
    return new Promise((resolve, reject) => {
      let ws;
      try { ws = new WebSocket(this.wsUrl()); } catch (e) { reject(e); return; }
      this.ws = ws;
      let authed = false;
      const failTimer = setTimeout(() => { if (!authed) { ws.close(); reject(new Error('timeout')); } }, 10000);

      ws.onmessage = async (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'auth_required') {
          ws.send(JSON.stringify({ type: 'auth', access_token: this.token }));
        } else if (msg.type === 'auth_ok') {
          authed = true; clearTimeout(failTimer); this.retry = 0;
          this.haVersion = msg.ha_version;
          try {
            const states = await this.send({ type: 'get_states' });
            await this.send({ type: 'subscribe_events', event_type: 'state_changed' });
            this.onStatus('ok');
            resolve(states);
          } catch (e) { reject(e); }
        } else if (msg.type === 'auth_invalid') {
          clearTimeout(failTimer); this.closedByUs = true; ws.close();
          reject(new Error('auth'));
        } else if (msg.type === 'result') {
          const p = this.pending.get(msg.id);
          if (p) { this.pending.delete(msg.id); msg.success ? p.resolve(msg.result) : p.reject(new Error(msg.error?.message || 'error')); }
        } else if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
          const { entity_id, new_state } = msg.event.data;
          this.onState(entity_id, new_state);
        }
      };
      ws.onerror = () => {};
      ws.onclose = () => {
        clearTimeout(failTimer);
        for (const p of this.pending.values()) p.reject(new Error('closed'));
        this.pending.clear();
        if (!authed) { reject(new Error('network')); return; }
        this.onStatus('down');
        if (!this.closedByUs) this.scheduleReconnect();
      };
    });
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    const wait = Math.min(30000, 1000 * 2 ** this.retry++);
    this.reconnectTimer = setTimeout(() => this.reconnect(), wait);
  }

  async reconnect() {
    if (this.ws && this.ws.readyState <= 1) return;
    try {
      const states = await this.connect();
      this.onResync?.(states);
    } catch (e) {
      if (e.message !== 'auth') this.scheduleReconnect();
      else this.onStatus('auth');
    }
  }

  isOpen() { return this.ws && this.ws.readyState === 1; }

  send(payload) {
    return new Promise((resolve, reject) => {
      if (!this.isOpen()) { reject(new Error('not connected')); return; }
      const id = this.id++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, ...payload }));
    });
  }

  callService(domain, service, data = {}, entityId) {
    return this.send({
      type: 'call_service', domain, service, service_data: data,
      target: entityId ? { entity_id: entityId } : undefined,
    });
  }

  close() { this.closedByUs = true; clearTimeout(this.reconnectTimer); this.ws?.close(); }
}

// ───────────────────────── Demo backend (pretend lights) ─────────────────────────
class DemoBackend {
  constructor() {
    this.kind = 'demo';
    this.onState = () => {};
    this.onStatus = () => {};
    this.haVersion = 'demo';
    this.members = { L1: 'light.bedside_left', L2: 'light.bedside_right', D1: 'light.downlight_1', D2: 'light.downlight_2' };
  }

  async connect() {
    const s = {};
    const light = (id, name, colour, on, b, k) => ({
      entity_id: id, state: on ? 'on' : 'off',
      attributes: {
        friendly_name: name, brightness: on ? Math.round(b * 2.55) : null, color_temp_kelvin: on ? k : null,
        rgb_color: on ? kelvinToRgb(k) : null,
        supported_color_modes: colour ? ['color_temp', 'xy'] : ['color_temp'],
        min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500,
      },
    });
    s[this.members.L1] = light(this.members.L1, 'Left Bedside Lamp', true, true, 60, 2700);
    s[this.members.L2] = light(this.members.L2, 'Right Bedside Lamp', true, false);
    s[this.members.D1] = light(this.members.D1, 'Downlight Door', false, true, 40, 3000);
    s[this.members.D2] = light(this.members.D2, 'Downlight Window', false, false);
    const g = (id, name, ids) => ({ entity_id: id, state: 'off', attributes: { friendly_name: name, entity_id: ids, supported_color_modes: ['color_temp', 'xy'], min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500 } });
    s[DEFAULT_GROUPS.lamps] = g(DEFAULT_GROUPS.lamps, 'Bedside Lamps', [this.members.L1, this.members.L2]);
    s[DEFAULT_GROUPS.downs] = g(DEFAULT_GROUPS.downs, 'Downlights', [this.members.D1, this.members.D2]);
    s[DEFAULT_GROUPS.all] = g(DEFAULT_GROUPS.all, 'Bedroom All Lights', Object.values(this.members));
    const ent = (id, state, attributes = {}) => { s[id] = { entity_id: id, state, attributes }; };
    const h = new Date().getHours();
    ent(IDS.daytime, h >= 8 && h < 18 ? 'on' : 'off');
    ent(IDS.period, h >= 22 || h < 7 ? 'night' : h >= 8 && h < 18 ? 'day' : 'evening');
    ent(IDS.phone, 'off');
    ent(IDS.partnerPhone, 'off');
    ent(IDS.bothPhones, 'off');
    ent(IDS.sleep, 'off');
    ent(IDS.autoGoodnight, 'on');
    ent(IDS.softStart, 'on');
    ent(IDS.lockout, 'off');
    ent(IDS.wake, 'off');
    ent(IDS.wakeWeekdays, 'on');
    ent(IDS.awayOff, 'on');
    ent(IDS.bedtime, '22:30:00');
    ent(IDS.wakeTime, '07:00:00');
    ent(IDS.goodnightFade, '1.0', { min: 0, max: 10, step: 1 });
    ent(IDS.nightBrightness, '5.0', { min: 1, max: 30, step: 1 });
    ent(IDS.wakeFade, '15.0', { min: 5, max: 45, step: 5 });
    ent(IDS.override, 'idle', { duration: '1:00:00' });
    ent(IDS.sleepTimer, 'idle', { duration: '0:30:00' });
    ent(IDS.windDown, 'off');
    ent(IDS.sunsetWelcome, 'off');
    ent(IDS.lastScene, '');
    ent(IDS.meInBed, 'off');
    ent(IDS.partnerInBed, 'off');
    ent(IDS.waiting, 'off');
    for (const sc of SCENES) ent(sceneEntity(sc.key), 'off', { friendly_name: `Scene · ${sc.name}` });
    for (const k of ['goodnight', 'allOff', 'wakeUp', 'unlock', 'sleepTimerScript', 'inBedScript']) ent(IDS[k], 'off');
    this.states = s;
    this.recalcGroups(false);
    this.onStatus('demo');
    return Object.values(s);
  }

  emit(id) { this.onState(id, this.states[id]); }

  setLight(id, on, b, k, rgb) {
    const st = this.states[id]; if (!st) return;
    const a = st.attributes;
    if (!on) { st.state = 'off'; a.brightness = null; a.color_temp_kelvin = null; a.rgb_color = null; }
    else {
      const wasOff = st.state !== 'on';
      st.state = 'on';
      if (b != null) a.brightness = Math.max(3, Math.round(b * 2.55));
      else if (wasOff || !a.brightness) a.brightness = a._lastB || 180;
      if (rgb) { a.rgb_color = rgb; a.color_temp_kelvin = null; }
      else if (k) { a.color_temp_kelvin = k; a.rgb_color = kelvinToRgb(k); }
      else if (!a.rgb_color) { a.color_temp_kelvin = 2700; a.rgb_color = kelvinToRgb(2700); }
      a._lastB = a.brightness;
    }
    st.last_changed = new Date().toISOString();
    this.emit(id);
  }

  recalcGroups(emit = true) {
    for (const gid of Object.values(DEFAULT_GROUPS)) {
      const g = this.states[gid];
      const on = g.attributes.entity_id.map((m) => this.states[m]).filter((m) => m.state === 'on');
      g.state = on.length ? 'on' : 'off';
      g.attributes.brightness = on.length ? Math.round(on.reduce((t, m) => t + m.attributes.brightness, 0) / on.length) : null;
      g.attributes.rgb_color = on[0]?.attributes.rgb_color || null;
      if (emit) this.emit(gid);
    }
  }

  expand(id) {
    const st = this.states[id];
    return st?.attributes.entity_id && id.startsWith('light.') ? st.attributes.entity_id : [id];
  }

  async callService(domain, service, data = {}, entityId) {
    await new Promise((r) => setTimeout(r, 60));
    const ids = [].concat(entityId || []);
    if (domain === 'light') {
      for (const id of ids.flatMap((i) => this.expand(i))) {
        const st = this.states[id];
        const on = service === 'turn_on' || (service === 'toggle' && st.state !== 'on');
        this.setLight(id, on, data.brightness_pct, data.color_temp_kelvin, data.rgb_color);
      }
      this.recalcGroups();
    } else if (domain === 'input_boolean') {
      for (const id of ids) {
        const st = this.states[id];
        st.state = service === 'turn_on' ? 'on' : service === 'turn_off' ? 'off' : st.state === 'on' ? 'off' : 'on';
        this.emit(id);
      }
    } else if (domain === 'input_datetime') {
      for (const id of ids) { this.states[id].state = data.time; this.emit(id); }
    } else if (domain === 'input_number' || domain === 'input_text') {
      for (const id of ids) { this.states[id].state = String(data.value); this.emit(id); }
    } else if (domain === 'timer') {
      for (const id of ids) {
        const st = this.states[id];
        const secs = data.duration ? data.duration.split(':').reduce((t, v) => t * 60 + Number(v), 0) : 3600;
        if (service === 'start') { st.state = 'active'; st.attributes.finishes_at = new Date(Date.now() + secs * 1000).toISOString(); }
        else { st.state = 'idle'; delete st.attributes.finishes_at; }
        this.emit(id);
      }
    } else if (domain === 'script') {
      for (const id of ids) this.runScript(id, data.variables || {});
    }
  }

  runScript(id, vars = {}) {
    const scene = SCENES.find((s) => sceneEntity(s.key) === id);
    if (scene) {
      for (const [k, spec] of Object.entries(scene.demo)) {
        this.setLight(this.members[k], !!spec, spec?.b, spec?.k, spec?.rgb);
      }
      this.states[IDS.lastScene].state = scene.key; this.emit(IDS.lastScene);
    } else if (id === IDS.sleepTimerScript) {
      const m = Number(vars.minutes || 30);
      this.callService('timer', 'start', { duration: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:00` }, IDS.sleepTimer);
    } else if (id === IDS.inBedScript) {
      const mine = vars.who === 'partner' ? IDS.partnerInBed : IDS.meInBed;
      this.states[mine].state = 'on'; this.emit(mine);
      const both = this.states[IDS.meInBed].state === 'on' && this.states[IDS.partnerInBed].state === 'on';
      if (this.states[IDS.bothPhones].state === 'off' || both) return this.runScript(IDS.goodnight);
      this.states[IDS.waiting].state = 'on'; this.emit(IDS.waiting);
      return this.runScript(sceneEntity('nightlight'));
    } else if (id === IDS.goodnight) {
      this.states[IDS.waiting].state = 'off'; this.emit(IDS.waiting);
      this.states[IDS.sleep].state = 'on'; this.emit(IDS.sleep);
      for (const m of Object.values(this.members)) this.setLight(m, false);
    } else if (id === IDS.allOff) {
      for (const m of Object.values(this.members)) this.setLight(m, false);
    } else if (id === IDS.wakeUp) {
      this.setLight(this.members.L1, true, 60, 2700); this.setLight(this.members.L2, true, 60, 2700);
      this.states[IDS.sleep].state = 'off'; this.emit(IDS.sleep);
      for (const k of [IDS.meInBed, IDS.partnerInBed, IDS.waiting]) { this.states[k].state = 'off'; this.emit(k); }
    } else if (id === IDS.unlock) {
      this.callService('timer', 'start', {}, IDS.override);
    }
    this.recalcGroups();
    if (this.states[DEFAULT_GROUPS.all].state === 'off') {
      this.states[IDS.lastScene].state = ''; this.emit(IDS.lastScene);
      if (this.states[IDS.sleepTimer].state === 'active') this.callService('timer', 'cancel', {}, IDS.sleepTimer);
    }
  }

  close() {}
}

// ───────────────────────── Colour helpers ─────────────────────────
function kelvinToRgb(k) {
  const t = k / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * (t - 60) ** -0.1332; g = 288.12 * (t - 60) ** -0.0755; b = 255; }
  const c = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return [c(r), c(g), c(b)];
}
function lightRgb(st) {
  const a = st?.attributes || {};
  if (a.rgb_color) return a.rgb_color;
  if (a.color_temp_kelvin) return kelvinToRgb(a.color_temp_kelvin);
  return [255, 200, 140];
}
const briPct = (st) => (st?.state === 'on' && st.attributes.brightness ? Math.max(1, Math.round(st.attributes.brightness / 2.55)) : 0);
const supportsColour = (st) => (st?.attributes?.supported_color_modes || []).some((m) => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m));
const supportsCt = (st) => (st?.attributes?.supported_color_modes || []).some((m) => ['color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m));

// ───────────────────────── App state ─────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const app = {
  backend: null,
  states: {},
  groups: { ...DEFAULT_GROUPS, ...store.get('groups', {}) },
  lastScene: null,
  sheetEntity: null,
  renderQueued: false,
};
const st = (id) => app.states[id];
const has = (id) => !!app.states[id];

function call(domain, service, data, entityId) {
  if (!app.backend) return Promise.resolve();
  return app.backend.callService(domain, service, data, entityId).catch((e) => {
    toast(e.message === 'not connected' ? '📡 Not connected – retrying…' : `⚠️ ${e.message}`);
  });
}

// Optimistic local update so the UI feels instant.
function optimisticLight(id, on, pct) {
  const s = app.states[id]; if (!s) return;
  const ids = s.attributes.entity_id && id.startsWith('light.') ? s.attributes.entity_id : [id];
  for (const m of ids.concat(id)) {
    const ms = app.states[m]; if (!ms) continue;
    ms.state = on ? 'on' : 'off';
    if (on && pct) ms.attributes.brightness = Math.round(pct * 2.55);
  }
  queueRender();
}

function haptic(ms = 10) { try { navigator.vibrate?.(ms); } catch { /* not supported */ } }

let toastTimer;
function toast(text) {
  const t = $('#toast');
  t.textContent = text; t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

function throttle(fn, ms) {
  let last = 0, timer, lastArgs;
  return (...args) => {
    lastArgs = args;
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
    else { clearTimeout(timer); timer = setTimeout(() => { last = Date.now(); fn(...lastArgs); }, ms - (now - last)); }
  };
}

// ───────────────────────── Connecting ─────────────────────────
function normaliseUrl(u) {
  u = (u || '').trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

async function start(mode) {
  app.backend?.close();
  const cfg = store.get('conn');
  const backend = mode === 'demo' || !cfg ? new DemoBackend() : new HABackend(cfg.url, cfg.token);
  app.backend = backend;
  backend.onState = (id, s) => {
    if (s) app.states[id] = s; else delete app.states[id];
    if (id === app.sheetEntity) renderSheet();
    queueRender();
  };
  backend.onStatus = (status) => {
    const c = $('#conn');
    c.className = 'conn' + (status === 'ok' ? ' ok' : status === 'demo' ? ' demo' : '');
    $('#conn-text').textContent = status === 'ok' ? `Connected to Home Assistant ${backend.haVersion || ''}`
      : status === 'demo' ? 'Demo mode – pretend lights' : status === 'auth' ? 'Token rejected – paste a new one below' : 'Reconnecting…';
  };
  backend.onResync = (states) => { setStates(states); };
  const states = await backend.connect();
  setStates(states);
  store.set('mode', backend.kind);
  showApp();
}

function setStates(list) {
  app.states = {};
  for (const s of list) app.states[s.entity_id] = s;
  buildScenes();
  queueRender();
}

function showSetup(errorText) {
  $('#app').hidden = true;
  $('#setup').hidden = false;
  const cfg = store.get('conn');
  if (cfg) $('#setup-url').value = cfg.url;
  const err = $('#setup-error');
  err.hidden = !errorText; err.textContent = errorText || '';
}

function showApp() {
  $('#setup').hidden = true;
  $('#app').hidden = false;
  const cfg = store.get('conn');
  $('#set-url').value = cfg?.url || '';
  $('#btn-demo').textContent = app.backend?.kind === 'demo' ? (cfg ? 'Back to my real lights' : 'Connect real lights') : 'Switch to demo';
  for (const input of $$('[data-id-field]')) input.value = app.groups[input.dataset.idField];
}

function explainError(e, url) {
  if (e.message === 'auth') return 'Home Assistant rejected that token. Create a new long-lived token and paste it again.';
  if (location.protocol === 'https:' && /^http:/i.test(url)) {
    return 'This app is on https, so your browser blocks plain http:// addresses. Use your https address (e.g. Nabu Casa), or open the copy of the app served by Home Assistant itself (see the README).';
  }
  return `Couldn't reach ${url}. Check the address, and that Home Assistant is reachable from where you are.`;
}

async function connectWith(url, token) {
  url = normaliseUrl(url);
  const probe = new HABackend(url, token);
  try {
    await probe.connect();
  } finally { probe.close(); }
  store.set('conn', { url, token });
  await start('ha');
}

// ───────────────────────── Rendering ─────────────────────────
function queueRender() {
  if (app.renderQueued) return;
  app.renderQueued = true;
  requestAnimationFrame(() => { app.renderQueued = false; render(); });
}

function groupMembers() {
  const ids = (gid) => st(gid)?.attributes?.entity_id || [];
  return [...ids(app.groups.lamps), ...ids(app.groups.downs)].filter((id, i, a) => a.indexOf(id) === i);
}

function render() {
  renderHeader();
  renderHero();
  renderBanner();
  renderLights();
  renderScenesActive();
  renderRoutines();
  renderSleepTimer();
}

function renderSleepTimer() {
  const t = st(IDS.sleepTimer);
  $('#sleep-timer').hidden = !t;
  if (!t) return;
  const active = t.state === 'active';
  $('#sleep-timer-text').textContent = active ? `😴 Lights off in ${minutesLeft(t)} min` : '😴 Sleep timer';
  for (const b of $$('[data-sleep]')) b.hidden = active;
  $('#sleep-cancel').hidden = !active;
}

function renderHeader() {
  const h = new Date().getHours();
  $('#greet').textContent = h < 5 ? 'Up late? 🦉' : h < 12 ? 'Good morning ☕' : h < 18 ? 'Good afternoon 🌤️' : 'Good evening ✨';
  const sleeping = st(IDS.sleep)?.state === 'on';
  const period = sleeping ? 'sleep' : (st(IDS.period)?.state || guessPeriod());
  document.body.dataset.period = period;
  const labels = { day: '☀️ Day', evening: '🌆 Evening', night: '🌙 Night', sleep: '😴 Sleep' };
  $('#period-chip').textContent = labels[period] || '🌆 Evening';
}
function guessPeriod() { const h = new Date().getHours(); return h >= 22 || h < 7 ? 'night' : h >= 8 && h < 18 ? 'day' : 'evening'; }

function renderHero() {
  const members = groupMembers().map(st).filter(Boolean);
  const on = members.filter((m) => m.state === 'on');
  const orb = $('#orb');
  orb.classList.toggle('off', on.length === 0);
  $('#orb-label').textContent = on.length ? 'On' : 'Off';
  $('#hero-count').textContent = members.length ? `${on.length} of ${members.length} on` : 'Looking for lights…';
  const rgb = on.length
    ? on.map(lightRgb).reduce((t, c) => t.map((v, i) => v + c[i] / on.length), [0, 0, 0]).map(Math.round)
    : [255, 190, 110];
  const avgBri = on.length ? on.reduce((t, m) => t + briPct(m), 0) / on.length : 0;
  document.documentElement.style.setProperty('--glow', rgb.join(', '));
  document.documentElement.style.setProperty('--glow-alpha', (on.length ? 0.35 + (avgBri / 100) * 0.65 : 0).toFixed(2));
  const slider = $('#room-bri');
  if (!slider.matches(':active') && !slider.dataset.dragging) slider.value = Math.round(avgBri) || 50;
  $('#pill-lamps').classList.toggle('on', st(app.groups.lamps)?.state === 'on');
  $('#pill-downs').classList.toggle('on', st(app.groups.downs)?.state === 'on');
}

function renderBanner() {
  const b = $('#banner');
  const sleeping = st(IDS.sleep)?.state === 'on';
  const lockOn = st(IDS.lockout)?.state === 'on' && st(IDS.daytime)?.state === 'on';
  const timer = st(IDS.override);
  let html = '';
  const whoAmI = store.get('who', 'me');
  if (st(IDS.waiting)?.state === 'on') {
    const myBed = st(whoAmI === 'partner' ? IDS.partnerInBed : IDS.meInBed)?.state === 'on';
    const text = myBed ? '🕯️ Nightlight on – waiting for the other person to go to bed.' : '🕯️ Nightlight on – tap Goodnight when you get into bed.';
    html = `<span>${text}</span><button class="btn small" data-act="alloff-now">Lights off now</button>`;
  } else if (sleeping) {
    html = '<span>😴 Sleep mode – switches give a soft glow.</span><button class="btn small" data-act="wake">I\'m up</button>';
  } else if (lockOn && timer?.state === 'active') {
    html = `<span>🔓 Daylight lock paused · ${minutesLeft(timer)} min left</span><button class="btn small" data-act="relock">Lock now</button>`;
  } else if (lockOn) {
    html = '<span>☀️ Daylight lock – wall switches are off till dusk.</span><button class="btn small" data-act="unlock">Pause 1h</button>';
  }
  b.hidden = !html;
  if (b.dataset.html !== html) { b.innerHTML = html; b.dataset.html = html; }
}
function minutesLeft(timer) {
  const f = timer?.attributes?.finishes_at;
  return f ? Math.max(0, Math.ceil((new Date(f) - Date.now()) / 60000)) : '?';
}

function renderLights() {
  const wrap = $('#lights');
  const ids = groupMembers();
  const key = ids.join(',');
  if (wrap.dataset.key !== key) {
    wrap.dataset.key = key;
    wrap.innerHTML = '';
    if (!ids.length) {
      wrap.innerHTML = '<p class="muted">No lights found. Did you add the Home Assistant package? (Settings → Light groups)</p>';
    }
    for (const id of ids) {
      const el = document.createElement('div');
      el.className = 'light';
      el.dataset.entity = id;
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      el.innerHTML = '<div class="l-top"><div class="bulb"></div><button class="l-more" aria-label="Adjust">⋯</button></div><div><div class="l-name"></div><div class="l-state"></div></div>';
      wrap.append(el);
    }
  }
  for (const el of $$('.light', wrap)) {
    const s = st(el.dataset.entity);
    const on = s?.state === 'on';
    el.classList.toggle('on', on);
    el.classList.toggle('unavailable', !s || s.state === 'unavailable');
    $('.l-name', el).textContent = prettyName(s, el.dataset.entity);
    $('.l-state', el).textContent = !s || s.state === 'unavailable' ? 'Unavailable' : on ? `${briPct(s)}%` : 'Off';
    const bulb = $('.bulb', el);
    bulb.style.setProperty('--c', lightRgb(s).join(', '));
    bulb.style.setProperty('--a', on ? (0.3 + briPct(s) / 100 * 0.7).toFixed(2) : 0);
  }
}
function prettyName(s, id) {
  return s?.attributes?.friendly_name || id.split('.')[1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildScenes() {
  const wrap = $('#scenes');
  const real = app.backend?.kind === 'ha';
  const list = SCENES.filter((s) => !real || has(sceneEntity(s.key)));
  wrap.innerHTML = '';
  if (!list.length) {
    wrap.innerHTML = '<p class="muted">No scenes found yet – add the Home Assistant package to get them.</p>';
    return;
  }
  for (const sc of list) {
    const b = document.createElement('button');
    b.className = 'scene';
    b.dataset.scene = sc.key;
    b.style.background = sc.bg;
    b.innerHTML = `<span class="s-emoji">${sc.emoji}</span><span class="s-name">${sc.name}</span>${sc.tag ? `<span class="s-tag">${sc.tag}</span>` : ''}`;
    wrap.append(b);
  }
}
function renderScenesActive() {
  const anyOn = groupMembers().some((id) => st(id)?.state === 'on');
  const shared = st(IDS.lastScene)?.state;
  const active = shared !== undefined ? shared : app.lastScene;
  for (const b of $$('.scene')) b.classList.toggle('active', anyOn && b.dataset.scene === active);
}

function renderRoutines() {
  for (const input of $$('[data-bool]')) {
    const s = st(IDS[input.dataset.bool]);
    input.disabled = !s;
    input.checked = s?.state === 'on';
    input.closest('.routine')?.classList.toggle('missing', !s && !!input.closest('.routine-head'));
  }
  for (const input of $$('[data-time]')) {
    const s = st(IDS[input.dataset.time]);
    input.disabled = !s;
    if (s && document.activeElement !== input) input.value = s.state.slice(0, 5);
  }
  for (const input of $$('[data-number]')) {
    const s = st(IDS[input.dataset.number]);
    input.disabled = !s;
    if (s && !input.dataset.dragging) input.value = Math.round(parseFloat(s.state));
    const label = $(`[data-number-label="${input.dataset.number}"]`);
    if (label) label.textContent = s ? `${input.value}${label.dataset.unit}` : '—';
  }
  const phoneText = (p) => (!p || p.state === 'unavailable' ? '❓ Not set up'
    : p.state === 'on' ? '⚡ Charging' : '🔋 Not charging');
  $('#phone-status').textContent = phoneText(st(IDS.phone));
  $('#partner-status').textContent = phoneText(st(IDS.partnerPhone));
  const timer = st(IDS.override);
  const active = timer?.state === 'active';
  $('#override-text').textContent = active ? `🔓 Paused · ${minutesLeft(timer)} min left` : 'Let switches work for an hour';
  $('#btn-override').textContent = active ? 'Lock now' : 'Pause 1h';
  $('#btn-override').disabled = !timer;
}

// ───────────────────────── Light sheet ─────────────────────────
function openSheet(id) {
  app.sheetEntity = id;
  $('#sheet').hidden = false;
  $('#sheet-backdrop').hidden = false;
  const s = st(id);
  const sw = $('#sheet-colours');
  sw.innerHTML = '';
  for (const c of COLOUR_SWATCHES) {
    const b = document.createElement('button');
    b.className = 'swatch'; b.style.background = `rgb(${c.join(',')})`; b.dataset.rgb = c.join(',');
    b.setAttribute('aria-label', `Colour ${c.join(',')}`);
    sw.append(b);
  }
  const ct = $('#sheet-ct');
  ct.min = s?.attributes?.min_color_temp_kelvin || 2000;
  ct.max = Math.min(s?.attributes?.max_color_temp_kelvin || 6500, MAX_KELVIN);
  renderSheet();
}
function closeSheet() {
  app.sheetEntity = null;
  $('#sheet').hidden = true;
  $('#sheet-backdrop').hidden = true;
}
function renderSheet() {
  const id = app.sheetEntity; if (!id) return;
  const s = st(id);
  const on = s?.state === 'on';
  $('#sheet-title').textContent = prettyName(s, id);
  $('#sheet-sub').textContent = on ? `${briPct(s)}% · ${s.attributes.color_temp_kelvin ? s.attributes.color_temp_kelvin + 'K' : 'colour'}` : 'Off';
  $('#sheet-toggle').checked = on;
  const bulb = $('#sheet-bulb');
  bulb.style.setProperty('--c', lightRgb(s).join(', '));
  bulb.style.setProperty('--a', on ? (0.3 + briPct(s) / 100 * 0.7).toFixed(2) : 0);
  const bri = $('#sheet-bri');
  if (!bri.dataset.dragging) bri.value = briPct(s) || 50;
  const ct = $('#sheet-ct');
  if (!ct.dataset.dragging && s?.attributes?.color_temp_kelvin) ct.value = s.attributes.color_temp_kelvin;
  $('#sheet-ct-wrap').hidden = !supportsCt(s);
  $('#sheet-colours-wrap').hidden = !supportsColour(s);
}

// ───────────────────────── Events ─────────────────────────
function bindDrag(input, onValue) {
  const send = throttle(onValue, 300);
  input.addEventListener('input', () => { input.dataset.dragging = '1'; send(Number(input.value)); });
  input.addEventListener('change', () => {
    onValue(Number(input.value));
    setTimeout(() => { delete input.dataset.dragging; }, 600);
  });
}

function toggleLight(id) {
  const s = st(id); if (!s) return;
  haptic();
  const turnOn = s.state !== 'on';
  optimisticLight(id, turnOn);
  call('light', turnOn ? 'turn_on' : 'turn_off', { transition: 0.5 }, id);
}

function wireEvents() {
  // Setup
  $('#setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#setup-connect');
    btn.disabled = true; btn.textContent = 'Connecting…';
    const url = $('#setup-url').value;
    try { await connectWith(url, $('#setup-token').value.trim()); }
    catch (err) { showSetup(explainError(err, normaliseUrl(url))); }
    finally { btn.disabled = false; btn.textContent = 'Connect'; }
  });
  $('#setup-demo').addEventListener('click', () => start('demo'));

  // Tabs
  for (const b of $$('.tabbar button')) {
    b.addEventListener('click', () => {
      haptic(5);
      for (const x of $$('.tabbar button')) x.classList.toggle('active', x === b);
      for (const t of $$('.tab')) t.hidden = t.dataset.tab !== b.dataset.go;
      window.scrollTo({ top: 0 });
    });
  }

  // Hero
  $('#orb').addEventListener('click', () => {
    haptic(15);
    const anyOn = groupMembers().some((id) => st(id)?.state === 'on');
    optimisticLight(app.groups.all, !anyOn);
    call('light', anyOn ? 'turn_off' : 'turn_on', { transition: 0.8 }, app.groups.all);
  });
  bindDrag($('#room-bri'), (v) => {
    const onIds = groupMembers().filter((id) => st(id)?.state === 'on');
    const target = onIds.length ? onIds : app.groups.all;
    for (const id of [].concat(target)) optimisticLight(id, true, v);
    call('light', 'turn_on', { brightness_pct: v, transition: 0.3 }, target);
  });
  $('#pill-lamps').addEventListener('click', () => toggleLight(app.groups.lamps));
  $('#pill-downs').addEventListener('click', () => toggleLight(app.groups.downs));

  // Scenes
  $('#scenes').addEventListener('click', (e) => {
    const b = e.target.closest('.scene'); if (!b) return;
    haptic(20);
    const sc = SCENES.find((s) => s.key === b.dataset.scene);
    app.lastScene = sc.key;
    b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
    toast(`${sc.emoji} ${sc.name}`);
    call('script', 'turn_on', {}, sceneEntity(sc.key));
    renderScenesActive();
  });

  // Lights: tap = toggle, ⋯ or long-press = details
  const lights = $('#lights');
  let pressTimer, longPressed = false;
  lights.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.light'); if (!card) return;
    longPressed = false;
    pressTimer = setTimeout(() => { longPressed = true; haptic(30); openSheet(card.dataset.entity); }, 450);
  });
  const cancelPress = () => clearTimeout(pressTimer);
  lights.addEventListener('pointerup', cancelPress);
  lights.addEventListener('pointerleave', cancelPress);
  lights.addEventListener('pointercancel', cancelPress);
  lights.addEventListener('contextmenu', (e) => { if (e.target.closest('.light')) e.preventDefault(); });
  lights.addEventListener('click', (e) => {
    const card = e.target.closest('.light'); if (!card) return;
    if (longPressed) { longPressed = false; return; }
    if (e.target.closest('.l-more')) { openSheet(card.dataset.entity); return; }
    toggleLight(card.dataset.entity);
  });
  lights.addEventListener('keydown', (e) => {
    const card = e.target.closest('.light');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleLight(card.dataset.entity); }
  });

  // Sheet
  $('#sheet-backdrop').addEventListener('click', closeSheet);
  $('#sheet-close').addEventListener('click', closeSheet);
  $('#sheet-toggle').addEventListener('change', () => toggleLight(app.sheetEntity));
  bindDrag($('#sheet-bri'), (v) => { optimisticLight(app.sheetEntity, true, v); call('light', 'turn_on', { brightness_pct: v, transition: 0.3 }, app.sheetEntity); });
  bindDrag($('#sheet-ct'), (v) => call('light', 'turn_on', { color_temp_kelvin: v, transition: 0.3 }, app.sheetEntity));
  $('#sheet-colours').addEventListener('click', (e) => {
    const b = e.target.closest('.swatch'); if (!b) return;
    haptic();
    call('light', 'turn_on', { rgb_color: b.dataset.rgb.split(',').map(Number), transition: 0.5 }, app.sheetEntity);
  });

  // Big buttons
  $('#btn-goodnight').addEventListener('click', () => {
    haptic(25); toast('🌙 Sweet dreams');
    if (has(IDS.inBedScript)) call('script', 'turn_on', { variables: { who: store.get('who', 'me') } }, IDS.inBedScript);
    else call('script', 'turn_on', {}, IDS.goodnight);
  });
  $('#btn-nightlight').addEventListener('click', () => {
    haptic(20); app.lastScene = 'nightlight'; toast('🕯️ Nightlight');
    call('script', 'turn_on', {}, sceneEntity('nightlight'));
  });

  // Bright is small, and at night it needs a press-and-hold so it can't be hit by accident.
  const bright = $('#btn-bright');
  const isNight = () => ['night', 'sleep'].includes(document.body.dataset.period);
  const goBright = () => { haptic(30); app.lastScene = 'golden'; toast('☀️ Bright'); call('script', 'turn_on', {}, sceneEntity('golden')); };
  let holdTimer, held = false;
  const endHold = () => { clearTimeout(holdTimer); bright.classList.remove('holding'); };
  bright.addEventListener('pointerdown', () => {
    held = false;
    if (!isNight()) return;
    bright.classList.add('holding');
    holdTimer = setTimeout(() => { held = true; endHold(); goBright(); }, 600);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) bright.addEventListener(ev, endHold);
  bright.addEventListener('contextmenu', (e) => e.preventDefault());
  bright.addEventListener('click', () => {
    if (held) { held = false; return; }
    if (isNight()) { toast('Hold to turn on Bright'); return; }
    goBright();
  });

  $('#btn-alloff').addEventListener('click', () => { haptic(15); optimisticLight(app.groups.all, false); call('script', 'turn_on', {}, IDS.allOff); });

  // Banner actions
  $('#banner').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'wake') call('input_boolean', 'turn_off', {}, IDS.sleep);
    if (act === 'alloff-now') { haptic(20); call('script', 'turn_on', {}, IDS.goodnight); }
    if (act === 'unlock') { toast('🔓 Switches work for 1 hour'); call('script', 'turn_on', {}, IDS.unlock); }
    if (act === 'relock') call('timer', 'cancel', {}, IDS.override);
  });

  // Routines
  for (const input of $$('[data-bool]')) {
    input.addEventListener('change', () => {
      haptic();
      call('input_boolean', input.checked ? 'turn_on' : 'turn_off', {}, IDS[input.dataset.bool]);
    });
  }
  for (const input of $$('[data-time]')) {
    input.addEventListener('change', () => {
      if (!input.value) return;
      call('input_datetime', 'set_datetime', { time: `${input.value}:00` }, IDS[input.dataset.time]);
      toast('⏰ Saved');
    });
  }
  for (const input of $$('[data-number]')) {
    input.addEventListener('input', () => {
      input.dataset.dragging = '1';
      const label = $(`[data-number-label="${input.dataset.number}"]`);
      if (label) label.textContent = `${input.value}${label.dataset.unit}`;
    });
    input.addEventListener('change', () => {
      call('input_number', 'set_value', { value: Number(input.value) }, IDS[input.dataset.number]);
      setTimeout(() => { delete input.dataset.dragging; }, 600);
    });
  }
  $('#btn-override').addEventListener('click', () => {
    const active = st(IDS.override)?.state === 'active';
    if (active) call('timer', 'cancel', {}, IDS.override);
    else { toast('🔓 Switches work for 1 hour'); call('script', 'turn_on', {}, IDS.unlock); }
  });
  $('#sleep-timer').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    haptic();
    if (b.id === 'sleep-cancel') { call('timer', 'cancel', {}, IDS.sleepTimer); toast('Sleep timer off'); return; }
    const m = Number(b.dataset.sleep);
    call('script', 'turn_on', { variables: { minutes: m } }, IDS.sleepTimerScript);
    toast(`😴 Lights fade out in ${m} min`);
  });
  $('#btn-wake-test').addEventListener('click', () => { toast('🌅 Here comes the sun'); call('script', 'turn_on', {}, IDS.wakeUp); });

  // Settings
  $('#settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = $('#set-url').value;
    const token = $('#set-token').value.trim() || store.get('conn')?.token;
    if (!url || !token) { toast('Add an address and token first'); return; }
    try { await connectWith(url, token); $('#set-token').value = ''; toast('✅ Connected'); }
    catch (err) { toast(explainError(err, normaliseUrl(url)).slice(0, 90)); }
  });
  for (const r of $$('input[name="who"]')) {
    r.checked = r.value === store.get('who', 'me');
    r.addEventListener('change', () => { store.set('who', r.value); toast(r.value === 'partner' ? "👋 This is your partner's phone" : '👋 This is your phone'); queueRender(); });
  }
  $('#btn-save-ids').addEventListener('click', () => {
    const g = {};
    for (const input of $$('[data-id-field]')) g[input.dataset.idField] = input.value.trim() || DEFAULT_GROUPS[input.dataset.idField];
    app.groups = g; store.set('groups', g);
    $('#lights').dataset.key = '';
    queueRender(); toast('Saved');
  });
  $('#btn-demo').addEventListener('click', () => {
    if (app.backend?.kind === 'demo') { store.get('conn') ? start('ha').catch((err) => showSetup(explainError(err, store.get('conn').url))) : showSetup(); }
    else start('demo');
  });
  $('#btn-forget').addEventListener('click', () => {
    if (!confirm('Remove the saved address and token from this phone?')) return;
    app.backend?.close(); store.clear(); app.groups = { ...DEFAULT_GROUPS };
    showSetup();
  });

  // iOS kills sockets in the background – reconnect when we come back.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && app.backend?.kind === 'ha' && !app.backend.isOpen()) app.backend.reconnect();
  });
  // Keep countdowns and greeting fresh.
  setInterval(queueRender, 30000);
}

// ───────────────────────── Boot ─────────────────────────
async function boot() {
  $('#version').textContent = `v${VERSION}`;
  wireEvents();
  const cfg = store.get('conn');
  const mode = store.get('mode');
  if (mode === 'demo') { await start('demo'); }
  else if (cfg) {
    try { await start('ha'); }
    catch (err) { showSetup(explainError(err, cfg.url)); }
  } else { showSetup(); }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
