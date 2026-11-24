'use strict';
/**
 * Optional AI layer for the Primetach WhatsApp bot — Google Gemini free tier.
 *
 * Only used for questions no fixed flow covers (unknown + specs). The fixed
 * flows in FLOWS.md always run first; order capture, prices and delivery
 * never go through the AI.
 *
 * Zero new dependencies — Node.js https only.
 *
 * Env:
 *   GEMINI_API_KEY   free key from Google AI Studio (aistudio.google.com).
 *                    No key = AI off, the bot behaves exactly as before.
 *   GEMINI_MODEL     default gemini-3.5-flash-lite (free tier).
 *   GEMINI_BASE_URL  override only for local tests (mock Gemini server).
 *
 * Safety: askAI returns null on ANY failure (no key, bad key, rate limit,
 * network, empty reply). The caller then falls back to the handover flow,
 * so the bot never crashes and never sends a half-broken AI reply.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_BASE = 'https://generativelanguage.googleapis.com';

const FALLBACK_PROMPT = [
  'You are the WhatsApp assistant for Primetach Watches, a men\'s watch shop in Quetta, Pakistan.',
  'Reply in the customer\'s language (Roman Urdu by default). Keep replies short: 1-3 lines.',
  'Facts: Golden watch Rs 3,499 (stainless steel chain). Black watch Rs 2,999 (rubber strap). Brand BOPHIERI.',
  'Men\'s watches only. Cash on delivery only, no advance payment. Free delivery all over Pakistan in 5-6 days.',
  '7-day exchange only if the watch is wrong or damaged. Every order is confirmed by a call from 0313 0868882.',
  'Never invent a price, a delivery day, or a specification. If a detail is not in these facts, say plainly that Abdul will check and tell them.',
].join('\n');

function loadSystemPrompt() {
  try {
    return fs.readFileSync(path.join(__dirname, 'AI-KNOWLEDGE.md'), 'utf8');
  } catch (_) {
    return FALLBACK_PROMPT;
  }
}

function postJson(urlStr, apiKey, body, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === 'http:' ? http : https;
    const payload = JSON.stringify(body);
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'http:' ? 80 : 443),
        path: u.pathname + u.search,
        method: 'POST',
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-goog-api-key': apiKey,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data || '{}'));
            } catch (_) {
              reject(new Error('bad JSON from AI'));
            }
          } else {
            reject(new Error(`AI HTTP ${res.statusCode}: ${String(data).slice(0, 200)}`));
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('AI timed out')));
    req.on('error', reject);
    req.end(payload);
  });
}

async function askAI(systemPrompt, history, userText) {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) return null; // AI off — caller falls back to handover.
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const base = (process.env.GEMINI_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const contents = [];
  for (const turn of (history || []).slice(-3)) {
    if (turn.user) contents.push({ role: 'user', parts: [{ text: turn.user }] });
    if (turn.bot) contents.push({ role: 'model', parts: [{ text: turn.bot }] });
  }
  contents.push({ role: 'user', parts: [{ text: userText }] });
  try {
    const out = await postJson(`${base}/v1beta/models/${model}:generateContent`, apiKey, {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 250 },
    });
    const parts = out && out.candidates && out.candidates[0] && out.candidates[0].content && out.candidates[0].content.parts;
    const text = parts ? parts.map((p) => p.text || '').join('').trim() : '';
    return text || null;
  } catch (e) {
    console.error('[AI ERROR]', e.message);
    return null; // any AI failure -> caller falls back to handover, never crashes.
  }
}

module.exports = { askAI, loadSystemPrompt };
