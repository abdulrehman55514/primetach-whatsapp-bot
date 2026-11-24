'use strict';
/**
 * Local test for server.js — no Meta account needed.
 * Starts the server as a child (DRY_RUN=1), sends fake Meta webhook calls,
 * and checks the replies the server logs. Exits 0 when all cases pass.
 *
 * Run: node test-local.js
 */
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 3101;
const VERIFY_TOKEN = 'test-token';
const APP_SECRET = 'test-secret';
const DATA_DIR = path.join(__dirname, 'data-test');
const SENDER = '923001234567';

let passed = 0;
let failed = 0;
let stdout = '';

function check(name, ok, extra) {
  if (ok) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${extra ? ' — ' + extra : ''}`);
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function get(pathname, port = PORT) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: pathname }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      })
      .on('error', reject);
  });
}
function postWebhook(payload, { sign = true, port = PORT } = {}) {
  const raw = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) };
  if (sign) {
    headers['X-Hub-Signature-256'] =
      'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
  }
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/webhook', method: 'POST', headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.end(raw);
  });
}
function metaMessage(text) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              messages: [{ from: SENDER, id: 'wamid.test-' + Math.random(), type: 'text', text: { body: text } }],
            },
          },
        ],
      },
    ],
  };
}
function waitFor(text, timeoutMs = 3000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (stdout.includes(text)) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(tick, 100);
    };
    tick();
  });
}

async function main() {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  let aiChild = null;
  let mock = null;
  const child = spawn('node', [path.join(__dirname, 'server.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      VERIFY_TOKEN,
      APP_SECRET,
      DRY_RUN: '1',
      DATA_DIR,
      AWAY_HOURS: 'off', // keep away-hours out of these cases
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => (stdout += d.toString()));
  child.stderr.on('data', (d) => (stdout += d.toString()));

  try {
    // Wait for the server to listen.
    let up = false;
    for (let i = 0; i < 30; i++) {
      try {
        const h = await get('/health');
        if (h.status === 200) {
          up = true;
          break;
        }
      } catch (_) {}
      await sleep(200);
    }
    check('server starts and /health answers', up);
    if (!up) throw new Error('server did not start');

    // 1. Webhook verification, right token.
    const ok1 = await get(`/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=CHALLENGE123`);
    check('verify GET with right token echoes challenge', ok1.status === 200 && ok1.body === 'CHALLENGE123', `${ok1.status} ${ok1.body}`);

    // 2. Webhook verification, wrong token.
    const ok2 = await get('/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=X');
    check('verify GET with wrong token is 403', ok2.status === 403, `${ok2.status}`);

    // 3. Unsigned POST is rejected when a secret is set.
    const ok3 = await postWebhook(metaMessage('price?'), { sign: false });
    check('unsigned POST is 401', ok3.status === 401, `${ok3.status}`);

    // 4. Price question -> both prices.
    const ok4 = await postWebhook(metaMessage('Golden watch ki price kya hai?'));
    check('price message accepted (200)', ok4.status === 200, `${ok4.status}`);
    check('price reply has golden Rs 3,499', await waitFor('Rs 3,499'));

    // 5. Order intent -> ask for the 4 details.
    await postWebhook(metaMessage('order karna hai'));
    check('order intent asks for details', await waitFor('Naam:'));

    // 6. Details in one message -> confirmation + order saved.
    await postWebhook(
      metaMessage('Naam: Ali Raza\nMobile: 03001234567\nPoora address: Street 1, Quetta\nCity: Quetta\nKonsi watch: Golden')
    );
    check('order details get confirmation reply', await waitFor('order note kar liya hai'));
    await sleep(300);
    const orders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders.json'), 'utf8'));
    check(
      'order saved with name, city and price 3499',
      orders.length === 1 && orders[0].name === 'Ali Raza' && orders[0].city === 'Quetta' && orders[0].price === 3499,
      JSON.stringify(orders)
    );

    // 7. Unknown question -> handover to Abdul.
    await postWebhook(metaMessage('tumhari ami kaisi hain'));
    check('unknown question hands over to Abdul', await waitFor('Abdul ko bhej raha hun'));

    // 8. Handover silence: another unknown message gets no reply.
    const before = stdout.length;
    await postWebhook(metaMessage('aur sunao'));
    await sleep(800);
    const after = stdout.slice(before);
    check('bot stays silent after handover', !after.includes('[DRY-RUN'));

    // 9. Delivery question -> 5-6 days (new question re-engages the bot).
    await postWebhook(metaMessage('delivery kitne din mein hogi?'));
    check('delivery reply says 5-6 din', await waitFor('5–6 din'));

    // 10. Status-only event -> 200, no reply.
    const before10 = stdout.length;
    const ok10 = await postWebhook({
      object: 'whatsapp_business_account',
      entry: [{ id: 'x', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', statuses: [{ id: 'wamid.x', status: 'delivered' }] } }] }],
    });
    await sleep(500);
    check('status event accepted, no reply sent', ok10.status === 200 && !stdout.slice(before10).includes('[DRY-RUN]'), `${ok10.status}`);

    // 11. Catalogue -> website link.
    await postWebhook(metaMessage('aur designs dikhao'));
    check('catalogue reply has website link', await waitFor('primetachwaches.myshopify.com'));

    // 12. Shop location -> Quetta address.
    await postWebhook(metaMessage('shop kahan hai'));
    check('location reply has Ani-din Street', await waitFor('Ani-din Street'));

    // 13. Ladies watch -> men's only.
    await postWebhook(metaMessage('ladies watch hai?'));
    check('mens-only reply', await waitFor("sirf men's watches"));

    // 14. Original? -> BOPHIERI brand.
    await postWebhook(metaMessage('original hai?'));
    check('brand reply names BOPHIERI', await waitFor('BOPHIERI'));

    // 15. Strap -> steel + rubber.
    await postWebhook(metaMessage('strap kaisa hai'));
    check('material reply has steel and rubber', (await waitFor('stainless steel')) && (await waitFor('rubber')));

    // 16. Details -> combined known facts.
    await postWebhook(metaMessage('details batao'));
    check('details reply has water resistant', await waitFor('water resistant'));

    // 17. Timing -> always open.
    await postWebhook(metaMessage('shop ki timing kya hai'));
    check('timing reply says har waqt khuli', await waitFor('har waqt khuli'));

    // 18. Contact -> Facebook page.
    await postWebhook(metaMessage('facebook page ka link bhejo'));
    check('contact reply has facebook page', await waitFor('facebook.com/primetachwatches'));

    // 19. Confirm call -> number 0313 0868882.
    await postWebhook(metaMessage('call kab aye gi'));
    check('confirm-call reply has 0313 0868882', await waitFor('0313 0868882'));

    // 20. Cancel -> cancel reply, then handover silence.
    await postWebhook(metaMessage('order cancel karna hai'));
    check('cancel reply', await waitFor('cancel kar dein ge'));
    const before21 = stdout.length;
    await postWebhook(metaMessage('ok'));
    await sleep(800);
    check('bot stays silent after cancel handover', !stdout.slice(before21).includes('[DRY-RUN]'));

    // 22. Specs (dial size) -> handover, no guessing.
    await postWebhook(metaMessage('dial size kitna hai'));
    check('specs question hands over, no invented size', await waitFor('Abdul ko bhej raha hun'));

    // 23. Wholesale -> handover to Abdul.
    await postWebhook(metaMessage('wholesale rate kya hai'));
    check('wholesale reply hands over', await waitFor('Abdul se baat'));

    // 24. Address change -> note + handover.
    await postWebhook(metaMessage('address change karna hai'));
    check('address-change reply asks for new address', await waitFor('Naya address'));

    // --- AI fallback (mock Gemini server + second bot child with a key) ---
    // The mock answers every generateContent call with a fixed text, and
    // 500s when the prompt contains 'server-error-test'.
    mock = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (body.includes('server-error-test')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'mock failure' } }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({ candidates: [{ content: { parts: [{ text: 'MOCK AI JAWAB: ye sawal ka jawab hai.' }] } }] })
          );
        }
      });
    });
    await new Promise((r) => mock.listen(3103, '127.0.0.1', r));
    const AI_PORT = 3102;
    const AI_DATA = path.join(__dirname, 'data-test-ai');
    fs.rmSync(AI_DATA, { recursive: true, force: true });
    aiChild = spawn('node', [path.join(__dirname, 'server.js')], {
      env: {
        ...process.env,
        PORT: String(AI_PORT),
        VERIFY_TOKEN,
        APP_SECRET,
        DRY_RUN: '1',
        DATA_DIR: AI_DATA,
        AWAY_HOURS: 'off',
        GEMINI_API_KEY: 'test-key',
        GEMINI_BASE_URL: 'http://127.0.0.1:3103',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    aiChild.stdout.on('data', (d) => (stdout += d.toString()));
    aiChild.stderr.on('data', (d) => (stdout += d.toString()));
    let aiUp = false;
    for (let i = 0; i < 30; i++) {
      try {
        const h = await get('/health', AI_PORT);
        if (h.status === 200) {
          aiUp = true;
          break;
        }
      } catch (_) {}
      await sleep(200);
    }
    check('AI bot child starts and /health answers', aiUp);
    if (!aiUp) throw new Error('AI bot child did not start');

    // 25. AI on: unknown question gets the AI reply, no handover.
    let mark = stdout.length;
    await postWebhook(metaMessage('tumhari ami kaisi hain'), { port: AI_PORT });
    check('AI fallback answers unknown question', await waitFor('MOCK AI JAWAB'));
    check('AI fallback does not hand over', !stdout.slice(mark).includes('Abdul ko bhej raha hun'));

    // 26. AI stays engaged on a follow-up unknown question.
    mark = stdout.length;
    await postWebhook(metaMessage('aur sunao, kya haal hai'), { port: AI_PORT });
    check('AI answers follow-up too, stays engaged', await waitFor('MOCK AI JAWAB'));
    check('follow-up does not hand over', !stdout.slice(mark).includes('Abdul ko bhej raha hun'));

    // 27. Specs question goes to AI, not handover.
    mark = stdout.length;
    await postWebhook(metaMessage('dial size kitna hai'), { port: AI_PORT });
    check('specs question gets AI reply when AI is on', await waitFor('MOCK AI JAWAB'));
    check('specs does not hand over when AI is on', !stdout.slice(mark).includes('Abdul ko bhej raha hun'));

    // 28. AI failure falls back to handover, server stays up.
    mark = stdout.length;
    await postWebhook(metaMessage('server-error-test, ye kya hai'), { port: AI_PORT });
    check('AI failure falls back to handover', await waitFor('Abdul ko bhej raha hun'));
    const aiHealth = await get('/health', AI_PORT);
    check('server still healthy after AI failure', aiHealth.status === 200);
  } finally {
    if (aiChild) aiChild.kill('SIGTERM');
    if (mock) mock.close();
    child.kill('SIGTERM');
    await sleep(300);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('TEST CRASH:', e.message);
  process.exit(2);
});
