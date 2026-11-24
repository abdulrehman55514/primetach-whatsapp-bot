'use strict';
/**
 * Primetach Watches — WhatsApp Cloud API webhook bot.
 *
 * Rule-based first. Replies are the fixed texts from FLOWS.md, word for
 * word. An optional AI layer (ai.js, Gemini free tier) answers only the
 * questions no flow covers, grounded in AI-KNOWLEDGE.md — it may never
 * invent a price, a delivery day, or a specification. Without a
 * GEMINI_API_KEY the bot behaves exactly as before: unknown -> handover.
 *
 * Zero dependencies — Node.js built-ins only (http, https, crypto, fs).
 *
 * Endpoints:
 *   GET  /webhook  — Meta verification (hub.mode / hub.verify_token / hub.challenge)
 *   POST /webhook  — incoming messages + delivery events (signature-checked)
 *   GET  /health   — liveness check
 *
 * Env:
 *   PORT             default 3000
 *   VERIFY_TOKEN     token you invent; paste the same one into Meta's webhook setup
 *   APP_SECRET       Meta app secret — enables X-Hub-Signature-256 checking
 *   WHATSAPP_TOKEN   permanent System User token (never the 24h test token)
 *   PHONE_NUMBER_ID  Meta phone number id for the business number
 *   DRY_RUN=1        log replies instead of calling Meta (default when no token)
 *   DATA_DIR         where conversations.json / orders.json / messages.log live
 *   AWAY_HOURS=off   disable the night away reply (flow 10)
 *   GEMINI_API_KEY   free key from Google AI Studio — enables the AI layer
 *   GEMINI_MODEL     default gemini-3.5-flash-lite (free tier)
 *   GEMINI_BASE_URL  override only for local tests (mock Gemini server)
 *
 * Run:  node server.js
 * Test: node test-local.js   (starts the server itself, runs fake Meta calls)
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { askAI, loadSystemPrompt } = require('./ai');

const CONFIG = {
  port: Number(process.env.PORT || 3000),
  verifyToken: process.env.VERIFY_TOKEN || 'primetach-verify',
  appSecret: process.env.APP_SECRET || '',
  whatsappToken: process.env.WHATSAPP_TOKEN || '',
  phoneNumberId: process.env.PHONE_NUMBER_ID || '',
  dataDir: process.env.DATA_DIR || path.join(__dirname, 'data'),
  awayOff: process.env.AWAY_HOURS === 'off',
};
const DRY_RUN = process.env.DRY_RUN === '1' || !CONFIG.whatsappToken;
const GRAPH_VERSION = 'v21.0';
const SYSTEM_PROMPT = loadSystemPrompt();

// ---------------------------------------------------------------------------
// Flows — exact texts from FLOWS.md. Do not reword them here; edit FLOWS.md
// and mirror the change, so the file stays the single source of truth.
// ---------------------------------------------------------------------------
const FLOW = {
  greeting:
    'Assalam o Alaikum, Primetach Watches mein khush aamdeed. Hamare paas men\'s watches hain, cash on delivery puray Pakistan mein. Golden watch Rs 3,499, black watch Rs 2,999. Order ke liye apna naam, address aur city bhej dein.',
  priceBoth:
    'Golden watch Rs 3,499 hai, black watch Rs 2,999 hai. Dono cash on delivery hain, delivery free hai, puray Pakistan mein. Konsi wali chahiye, golden ya black?',
  priceGolden:
    'Golden watch Rs 3,499 hai, cash on delivery, free delivery 5–6 din mein. Order karna ho to naam, address aur city bhej dein.',
  priceBlack:
    'Black watch Rs 2,999 hai, cash on delivery, free delivery 5–6 din mein. Order karna ho to naam, address aur city bhej dein.',
  orderAsk:
    'Shukriya, order ke liye ye details bhej dein:\nNaam:\nMobile number:\nPoora address:\nCity:\nKonsi watch: Golden (Rs 3,499) ya Black (Rs 2,999)?',
  orderDone:
    'Shukriya, apka order note kar liya hai. Hum 0313 0868882 se call kar ke confirm karein ge, phir parcel bhej dein ge. Parcel milne par cash dena hoga, pehle koi payment nahi.',
  delivery:
    'Free delivery 5–6 din mein ho jati hai, puray Pakistan mein. Parcel dispatch hote hi apko tracking number yahin bhej dein ge.',
  trackingNoNumber:
    'Apka order check kar ke batata hun, thori der mein jawab deta hun.',
  exchange:
    'Afsoos hua. Ghalat ya kharab watch 7 din ke andar exchange ho jaye gi. Watch ki photo yahin bhej dein, hum check kar ke exchange kar dein ge.',
  waterproof:
    'Ye watch water resistant hai, roz ke istemal aur halki barish ya haath dhone mein masla nahi. Swimming ya garam pani mein istemal na karein.',
  discount:
    'Sir, price pehle se hi kam rakhi hai aur delivery par bhi koi extra charges nahi le rahe. Quality dekh kar apko price theek lage gi, cash on delivery hai, parcel milne par hi paisay dein.',
  payment:
    'Cash on delivery hai, parcel milne par hi paisay dein. Pehle koi payment nahi karni.',
  away:
    'Assalam o Alaikum, abhi hum available nahi hain. Apna sawal yahin likh dein, shaam ko jawab de dein ge. Shukriya.',
  handover:
    'Ye sawal main Abdul ko bhej raha hun, wo khud jawab dein ge. Thori der intezar karein, shukriya.',
  photoReceived:
    'Shukriya, apki photo mil gayi hai. Abdul check kar ke jawab dein ge.',
  catalogue:
    'Saare designs aur photos yahan dekhein: https://primetachwaches.myshopify.com/ — Golden watch Rs 3,499, Black watch Rs 2,999. Jo pasand aaye uska naam bhej dein, order kar dein ge.',
  location:
    'Hamari shop Quetta mein hai, Ani-din Street, Masjid Road. Online order puray Pakistan mein cash on delivery par ho jata hai.',
  mensOnly:
    "Hum sirf men's watches bechte hain, ladies ya bachon ki watches nahi hain.",
  brand:
    'Ye BOPHIERI brand ki watch hai. Ye Rolex ya kisi aur brand ki copy nahi hai.',
  materialBoth:
    'Golden watch ki chain stainless steel ki hai, black watch ka strap rubber ka hai.',
  materialGolden:
    'Golden watch ki chain stainless steel ki hai.',
  materialBlack:
    'Black watch ka strap rubber ka hai.',
  cancel:
    'Order cancel karna ho to bata dein. Agar parcel dispatch nahi hua to order cancel kar dein ge.',
  addressChange:
    'Naya address bhej dein, hum note kar lein ge aur parcel naye address par bhej dein ge.',
  confirmCall:
    'Order ke baad hum 0313 0868882 se call kar ke confirm karein ge, phir parcel bhej dein ge.',
  wholesale:
    'Wholesale ke liye Abdul se baat karni hogi, ye sawal un ko bhej raha hun.',
  contact:
    'Hamara Facebook page: facebook.com/primetachwatches — Instagram: @primetach_watches — Website: https://primetachwaches.myshopify.com/',
  details:
    'Golden watch: stainless steel chain, Rs 3,499. Black watch: rubber strap, Rs 2,999. Dono water resistant hain, cash on delivery hai, free delivery 5–6 din mein.',
  timing:
    'Hamari online shop har waqt khuli hai — order kabhi bhi kar sakte hain. Call par confirmation din mein hoti hai.',
};

const ASK_FIELD = {
  name: 'Apna naam bhej dein.',
  mobile: 'Apna mobile number bhej dein.',
  address: 'Poora address bhej dein.',
  city: 'City ka naam bhej dein.',
  watch: 'Konsi watch chahiye, Golden (Rs 3,499) ya Black (Rs 2,999)?',
};
const FIELD_ORDER = ['name', 'mobile', 'address', 'city', 'watch'];

// ---------------------------------------------------------------------------
// Storage — plain JSON files next to the server. No database to run.
// ---------------------------------------------------------------------------
fs.mkdirSync(CONFIG.dataDir, { recursive: true });
const CONV_FILE = path.join(CONFIG.dataDir, 'conversations.json');
const ORDERS_FILE = path.join(CONFIG.dataDir, 'orders.json');
const LOG_FILE = path.join(CONFIG.dataDir, 'messages.log');

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}
function saveJson(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}
function logLine(obj) {
  fs.appendFileSync(LOG_FILE, JSON.stringify({ t: new Date().toISOString(), ...obj }) + '\n');
}

let conversations = loadJson(CONV_FILE, {});
let orders = loadJson(ORDERS_FILE, []);

function getState(from) {
  if (!conversations[from]) {
    conversations[from] = { stage: 'idle', order: {}, handedOver: false, lastAway: '', history: [] };
  }
  return conversations[from];
}
function saveState() {
  saveJson(CONV_FILE, conversations);
}

// ---------------------------------------------------------------------------
// Sending — Cloud API, or dry-run log when no token is configured.
// ---------------------------------------------------------------------------
function sendMessage(to, body) {
  logLine({ dir: 'out', to, body });
  if (DRY_RUN) {
    console.log(`[DRY-RUN -> ${to}] ${body}`);
    return Promise.resolve({ dryRun: true });
  }
  const payload = JSON.stringify({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'graph.facebook.com',
        path: `/${GRAPH_VERSION}/${CONFIG.phoneNumberId}/messages`,
        method: 'POST',
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${CONFIG.whatsappToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data || '{}'));
          else {
            console.error(`[SEND FAIL ${res.statusCode}] ${data}`);
            reject(new Error(`Meta send failed: ${res.statusCode} ${data}`));
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('Meta send timed out')));
    req.on('error', reject);
    req.end(payload);
  });
}

// ---------------------------------------------------------------------------
// Routing — keyword intents, in priority order. Specific intents first,
// greeting last, unknown -> handover. Never guess: unknown means handover.
// ---------------------------------------------------------------------------
function norm(text) {
  return (text || '').toLowerCase().replace(/[?!.,;:()"]/g, ' ').replace(/\s+/g, ' ').trim();
}
function has(text, words) {
  return words.some((w) => text.includes(w));
}

function detectIntent(text) {
  const t = norm(text);
  if (has(t, ['cancel', 'mansookh'])) return 'cancel';
  if (has(t, ['address badal', 'address change', 'pata badal', 'pata change'])) return 'addressChange';
  if (has(t, ['ladies', 'larki', 'aurat', 'women', 'bachon', 'bacha', 'kids', 'girl'])) return 'mensOnly';
  if (has(t, ['wholesale', 'bulk', 'thok'])) return 'wholesale';
  if (has(t, ['order karna', 'order krna', 'order karna hai', 'mujhe ye chahiye', 'mujhe chahiye', 'book kar', 'mangwana', 'lena hai', 'buy karna', 'order place'])) return 'order';
  if (has(t, ['mera order kahan', 'order kahan hai', 'order kahan', 'tracking', 'parcel kahan', 'parcel kidhar', 'track kar', 'order update', 'order status', 'status'])) return 'tracking';
  if (has(t, ['call kab', 'confirm call', 'phone kab', 'call aye', 'call karein'])) return 'confirmCall';
  if (has(t, ['kab mile', 'kab aye', 'kitne din', 'delivery kab', 'delivery time', 'kab pahunche', 'dispatch'])) return 'delivery';
  if (has(t, ['kharab', 'wapis', 'wapsi', 'change karni', 'exchange', 'return', 'tooti', 'tuta', 'damage', 'kharaab'])) return 'exchange';
  if (has(t, ['waterproof', 'water resistant', 'pani mein', 'quality kaisi', 'quality kesi', 'acha hai ya nahi'])) return 'waterproof';
  if (has(t, ['discount', 'kam karo', 'sasti', 'offer hai', 'rate kam'])) return 'discount';
  if (has(t, ['advance', 'jazzcash', 'jazz cash', 'easypaisa', 'easy paisa', 'online payment', 'payment pehle', 'bank transfer'])) return 'payment';
  if (has(t, ['price', 'rate', 'kitne ki', 'kitni ki', 'kimat', 'qeemat', 'cost', 'kitne ka', 'kitni ka', 'daam'])) return 'price';
  if (has(t, ['design', 'photo', 'tasveer', 'picture', 'catalogue', 'catalog', 'aur dikhao', 'collection', 'dekhna hai', 'saare designs'])) return 'catalogue';
  if (has(t, ['shop kahan', 'dukkan kahan', 'dukkan', 'location', 'shop address', 'quetta mein kahan', 'address kahan', 'quetta'])) return 'location';
  if (has(t, ['timing', 'kab khulta', 'khula hai', 'open hai', 'kab khula'])) return 'timing';
  if (has(t, ['original', 'asli', 'copy', 'rolex', 'brand konsa', 'kis brand', 'konsa brand'])) return 'brand';
  if (has(t, ['strap', 'chain', 'steel', 'rubber', 'leather', 'belt'])) return 'material';
  if (has(t, ['details', 'tafseel', 'features', 'kya kya hai'])) return 'details';
  if (/\b(size|mm|battery|automatic|cell)\b/.test(t) || t.includes('date hai') || t.includes('dial')) return 'specs';
  if (has(t, ['facebook', 'instagram', 'website', 'link', 'insta'])) return 'contact';
  if (has(t, ['salam', 'aoa', 'assalam', 'hello', 'hi ', ' hey ', 'adaab', 'salaam'])) return 'greeting';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Order capture — parse labelled lines, a mobile number, and golden/black.
// Whatever is missing is asked one field at a time, in FIELD_ORDER.
// ---------------------------------------------------------------------------
function parseOrderFields(text) {
  const out = {};
  for (const line of String(text).split('\n')) {
    // Label may be multi-word, e.g. "Poora address:" or "Konsi watch:" —
    // the labels the bot itself asks for in FLOW.orderAsk.
    const m = line.match(/^\s*[^:\n]*?\b(naam|name|mobile|number|phone|address|pata|city|shehar|watch)\b\s*[:\-–]\s*(.+?)\s*$/i);
    if (!m) continue;
    const label = m[1].toLowerCase();
    const value = m[2].trim();
    if (!value) continue;
    if (label === 'naam' || label === 'name') out.name = value;
    else if (label === 'mobile' || label === 'number' || label === 'phone') out.mobile = value;
    else if (label === 'address' || label === 'pata') out.address = value;
    else if (label === 'city' || label === 'shehar') out.city = value;
    else if (label === 'watch') out.watch = value;
  }
  const mob = String(text).match(/(?:\+?92|0)?\s*3\d{2}[\s-]?\d{7}/);
  if (mob) out.mobile = mob[0].replace(/[\s-]/g, '');
  if (/\bgolden\b|sunheri|sunehri|gold/i.test(text)) out.watch = 'Golden';
  else if (/\bblack\b|kali|kala/i.test(text)) out.watch = 'Black';
  return out;
}

function handleCollecting(from, state, text) {
  const found = parseOrderFields(text);
  // A bare reply while one field is missing is that field's value,
  // unless it parses as a different labelled field.
  const missing = FIELD_ORDER.filter((f) => !state.order[f]);
  if (missing.length && Object.keys(found).length === 0) {
    const field = missing[0];
    const value = String(text).trim();
    if (field === 'mobile') {
      const mob = value.match(/(?:\+?92|0)?\s*3\d{2}[\s-]?\d{7}/);
      if (!mob) return { reply: 'Mobile number sahi nahi lag raha. Apna mobile number dobara bhej dein, jaise 03001234567.', state };
      state.order.mobile = mob[0].replace(/[\s-]/g, '');
    } else if (field === 'watch') {
      if (/\bgolden\b|sunheri|sunehri|gold/i.test(value)) state.order.watch = 'Golden';
      else if (/\bblack\b|kali|kala/i.test(value)) state.order.watch = 'Black';
      else return { reply: ASK_FIELD.watch, state };
    } else {
      state.order[field] = value;
    }
  } else {
    Object.assign(state.order, found);
  }
  const stillMissing = FIELD_ORDER.filter((f) => !state.order[f]);
  if (stillMissing.length === 0) {
    const order = {
      from,
      ...state.order,
      price: state.order.watch === 'Black' ? 2999 : 3499,
      placedAt: new Date().toISOString(),
    };
    orders.push(order);
    saveJson(ORDERS_FILE, orders);
    state.stage = 'idle';
    state.order = {};
    return { reply: FLOW.orderDone, state, order };
  }
  return { reply: ASK_FIELD[stillMissing[0]], state };
}

// AI fallback — only for questions no flow covers. Returns the AI reply,
// or null when the key is missing or the call fails (caller hands over).
async function tryAI(state, text) {
  if (!process.env.GEMINI_API_KEY) return null;
  return askAI(SYSTEM_PROMPT, state.history || [], text);
}

// ---------------------------------------------------------------------------
// One incoming text message -> reply text (or null = stay silent).
// ---------------------------------------------------------------------------
function isAwayHours() {
  if (CONFIG.awayOff) return false;
  const hour = (new Date().getUTCHours() + 5) % 24; // PKT = UTC+5
  return hour >= 22 || hour < 8;
}

async function handleText(from, text) {
  const state = getState(from);

  // Night away reply, once per night per sender. The message is logged,
  // so Abdul can follow it up in the morning.
  if (isAwayHours()) {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastAway !== today) {
      state.lastAway = today;
      saveState();
      return { reply: FLOW.away, state };
    }
  }

  // Handover: stay silent until a new clear question arrives.
  if (state.handedOver) {
    const intent = detectIntent(text);
    if (intent === 'unknown' || intent === 'greeting') return { reply: null, state };
    state.handedOver = false;
  }

  if (state.stage === 'collecting') {
    return handleCollecting(from, state, text);
  }

  const intent = detectIntent(text);
  switch (intent) {
    case 'greeting':
      return { reply: FLOW.greeting, state };
    case 'price': {
      const t = norm(text);
      if (t.includes('golden') || t.includes('sunheri') || t.includes('sunehri')) return { reply: FLOW.priceGolden, state };
      if (t.includes('black') || t.includes('kali') || t.includes('kala')) return { reply: FLOW.priceBlack, state };
      return { reply: FLOW.priceBoth, state };
    }
    case 'order':
      state.stage = 'collecting';
      state.order = {};
      return { reply: FLOW.orderAsk, state };
    case 'delivery':
      return { reply: FLOW.delivery, state };
    case 'tracking':
      // The bot has no tracking data — answer, then hand over to Abdul.
      state.handedOver = true;
      return { reply: FLOW.trackingNoNumber, state };
    case 'exchange':
      return { reply: FLOW.exchange, state };
    case 'waterproof':
      return { reply: FLOW.waterproof, state };
    case 'discount':
      return { reply: FLOW.discount, state };
    case 'payment':
      return { reply: FLOW.payment, state };
    case 'cancel':
      state.handedOver = true;
      return { reply: FLOW.cancel, state };
    case 'addressChange':
      state.handedOver = true;
      return { reply: FLOW.addressChange, state };
    case 'catalogue':
      return { reply: FLOW.catalogue, state };
    case 'location':
      return { reply: FLOW.location, state };
    case 'timing':
      return { reply: FLOW.timing, state };
    case 'brand':
      return { reply: FLOW.brand, state };
    case 'material': {
      const t = norm(text);
      if (t.includes('golden') || t.includes('sunheri') || t.includes('sunehri')) return { reply: FLOW.materialGolden, state };
      if (t.includes('black') || t.includes('kali') || t.includes('kala')) return { reply: FLOW.materialBlack, state };
      return { reply: FLOW.materialBoth, state };
    }
    case 'details':
      return { reply: FLOW.details, state };
    case 'specs': {
      // Size / battery / automatic / date are not in the flows. The AI
      // answers from AI-KNOWLEDGE.md and says plainly when a detail is
      // not there — it never invents a specification.
      const ai = await tryAI(state, text);
      if (ai) return { reply: ai, state };
      state.handedOver = true;
      return { reply: FLOW.handover, state };
    }
    case 'mensOnly':
      return { reply: FLOW.mensOnly, state };
    case 'wholesale':
      state.handedOver = true;
      return { reply: FLOW.wholesale, state };
    case 'contact':
      return { reply: FLOW.contact, state };
    case 'confirmCall':
      return { reply: FLOW.confirmCall, state };
    case 'unknown':
    default: {
      const ai = await tryAI(state, text);
      if (ai) return { reply: ai, state };
      state.handedOver = true;
      return { reply: FLOW.handover, state };
    }
  }
}

// ---------------------------------------------------------------------------
// Webhook plumbing.
// ---------------------------------------------------------------------------
function verifySignature(rawBody, signature) {
  if (!CONFIG.appSecret) {
    console.warn('[WARN] APP_SECRET not set — signature check skipped (set it in production).');
    return true;
  }
  if (!signature || !signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', CONFIG.appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function processPayload(payload) {
  const entries = payload.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const msg of value.messages || []) {
        const from = msg.from;
        const state = getState(from);
        if (msg.type === 'text' && msg.text && msg.text.body) {
          const text = msg.text.body;
          logLine({ dir: 'in', from, text });
          const { reply } = await handleText(from, text);
          if (reply) {
            state.history = [...(state.history || []), { user: text, bot: reply }].slice(-6);
          }
          saveState();
          if (reply) sendMessage(from, reply).catch((e) => console.error('[SEND ERROR]', e.message));
        } else if (msg.type) {
          // Photo / audio / other media: acknowledge, hand over to Abdul.
          logLine({ dir: 'in', from, text: `[${msg.type} message]` });
          state.handedOver = true;
          saveState();
          sendMessage(from, FLOW.photoReceived).catch((e) => console.error('[SEND ERROR]', e.message));
        }
      }
    }
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/webhook') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === CONFIG.verifyToken && challenge) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge);
    } else {
      res.writeHead(403);
      res.end('Forbidden');
    }
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, dryRun: DRY_RUN, orders: orders.length }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/webhook') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      if (!verifySignature(raw, req.headers['x-hub-signature-256'])) {
        res.writeHead(401);
        res.end('Bad signature');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('EVENT_RECEIVED');
      try {
        processPayload(JSON.parse(raw.toString('utf8'))).catch((e) =>
          console.error('[PAYLOAD ERROR]', e.message)
        );
      } catch (e) {
        console.error('[PAYLOAD ERROR]', e.message);
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(CONFIG.port, () => {
  console.log(`Primetach WhatsApp bot listening on port ${CONFIG.port} (dryRun=${DRY_RUN})`);
});

module.exports = { server, handleText, detectIntent, parseOrderFields, FLOW };
