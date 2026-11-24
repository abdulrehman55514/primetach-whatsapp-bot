# WhatsApp AI Bot — Build Plan for Primetach Watches

Researched and written: 23 November 2026. Prices checked this day from vendor pages and Meta's rate card (effective 1 October 2026). USD to PKR uses ~Rs 277 per $1 (rate noted 12 Nov 2026) — treat PKR figures as approximate.

Business: Primetach Watches, men's watches, cash on delivery, Pakistan.
Business number: +92 313 0868882 (WhatsApp Business).
Real facts the bot must use: golden watch Rs 3,499; black watch Rs 2,999; COD nationwide; free delivery 5–6 days; 7-day exchange for wrong/damaged (via WhatsApp); every order confirmed by a phone call from 0313 0868882.
Owner constraint: Abdul Rehman has NO CNIC and no government photo ID, no NTN, no SECP registration.

## What the Noora bot in his screenshot most likely is

The screenshot shows a Business Account (+92 333 3337853, "Noora") whose replies carry an "AI" label and answer natural-language questions in Roman Urdu about an entrance test and e-commerce classes. That "AI" label on replies is Meta's own marker.

The most likely product is **Meta Business Agent** — Meta's own AI agent inside the WhatsApp Business app. Meta launched it worldwide on 3 June 2026 (TechCrunch, 3 June 2026). It answers customer questions itself, learns from the business's catalog, price list, FAQs, website and past chats, labels its replies as AI, and hands chats to a human when told to. Setup is inside the app (Tools → Meta Business Agent), takes minutes, and is free to start; paid subscriptions under "Meta One" followed from September 2026 (business tiers from $14.99/month in the US — no Pakistan price published).

It could also be a BSP AI agent (Wati Astra, Interakt AI Agent, Zoko Guru), which behaves the same way from the customer's side. The "AI" label points to Meta's own agent first. The only way to know is to check his own app: WhatsApp Business → Tools → look for "Meta Business Agent". If it is there, that is the answer.

Sources:
- https://techcrunch.com/2026/06/03/metas-ai-agent-for-whatsapp-business-is-now-available-globally/
- https://hestaren.com/articles/meta-business-agent-ai-customer-service/
- https://digitthype.com/blog-post.php?post=ai-chatbot-whatsapp-agent-business-pakistan

## Recommendation

**Route 1 (do this first): Meta Business Agent, free, in the app.**
Zero code, zero monthly platform fee, keeps his number and chats in the WhatsApp Business app, handover to Abdul is built in, and it is the closest thing to the Noora bot. Cost: Rs 0 to start. If Meta later charges for heavy use (Meta One), he can decide then; at his current volume (no real customers yet) the free tier covers him. Risk: availability is "select markets / eligible businesses" — it may simply not appear in his app. Check takes 2 minutes on his phone. If it appears, feed it the FAQ list in FLOWS.md and switch it on.

**Route 2 (if Route 1 is not available): custom build on the WhatsApp Cloud API.**
A small webhook server + an AI model, built once, no monthly platform fee. Running cost at his volume: a small VPS ~$5/month (about Rs 1,400) + AI usage a few dollars at most + Meta message fees (first 1,000 service replies per number per month free; after that $0.015 per reply, about Rs 4.15). Realistic total: roughly Rs 1,500–3,000/month at low volume. This is the cheapest real AI bot and it is fully under his control. It needs a build (webhook, AI prompts, handover logic) and someone to keep the server running. No business verification is needed to start (see below).

**Route 3 (no-code fallback, only if he wants zero code and will pay): Wati Growth.**
Wati Growth is $69/month month-to-month ($59/month billed annually), about Rs 19,100 / Rs 16,300, and now includes 1 Astra AI agent and 2,000 Wati AI credits/month. Meta message fees are extra, on Wati's rate card (about 20% above Meta's rates). This is the cheapest no-code option that actually includes an AI agent. Interakt's AI path is worse value: Growth $55/month + AI agent add-on $74.99/month = about $130/month (about Rs 36,000). Zoko's path is Starter $49.99/month + FAQ AI agent $24.99/month + $0.09 per resolution after the first 100 = about $75/month (about Rs 20,800) plus Meta fees. None of these make sense while he has no customers; they are listed so the choice is honest.

**Not recommended: unofficial libraries (Baileys, whatsapp-web.js, Evolution API in Baileys mode).**
These drive a normal WhatsApp account through a QR code and break WhatsApp's Terms of Service. WhatsApp detects and bans numbers automatically — temporary suspensions up to permanent blacklisting of the number, with no warning and no guaranteed recovery. Ban reports rose sharply in late 2025. His business number is his only customer channel. Do not put it on an unofficial library.

Sources:
- https://www.stork.ai/en/wati-io
- https://promptwises.com/reviews/wati-review
- https://www.saasranked.com/software/interakt/
- https://platform.tendabot.com/vs/interakt
- https://www.zoko.io/pricing
- https://voltade.com/blog/zoko-review
- https://github.com/Joe-Heffer/deploy-openclaw/blob/HEAD/docs/WHATSAPP_LEGAL.md
- https://www.elfclick.com/will-my-number-get-banned

## Meta WhatsApp Cloud API — the official route, step by step

Official name now: WhatsApp Business Platform; the part software talks to is the Cloud API. The old On-Premises API is dead (final expiry 23 October 2025).

1. Meta developer account: register at developers.facebook.com (free, needs his Facebook login).
2. Business portfolio (Business Manager): create or pick one at business.facebook.com. Required — no portfolio, no platform.
3. Create a Meta app (type Business) and add the WhatsApp product. Meta immediately gives a free test phone number and a temporary 24-hour access token.
4. Test mode: the test number can send to up to 5 allowlisted recipient numbers, each verified by OTP. That is a hard allowlist — real customers cannot be messaged from the test number. Good for building and testing the bot with his own phones only.
5. Register the real business number: the number must be able to receive an SMS or voice call for a 6-digit PIN. A number already active on WhatsApp or WhatsApp Business app cannot be registered until that account is deleted — unless you use Coexistence (below). Set a 2-step verification PIN.
6. Production credentials: create a System User in the portfolio and a permanent access token. The short test token expires in 24 hours and must never be used in production.
7. Webhook: a public HTTPS URL that receives incoming messages and delivery events from Meta, verifies Meta's signature, and replies through the Cloud API. The AI (prompts + FAQ knowledge + handover rules) lives in this server.
8. Message templates: any message sent outside the 24-hour customer-service window must be an approved template (order confirm, dispatch update). Templates go through Meta approval. Inside the 24-hour window, free-form replies (service messages) are allowed.
9. Messaging limits: a new business portfolio starts at 250 unique customers per rolling 24 hours. Limit rises to 2,000 by (a) business verification, (b) partner verification, or (c) 2,000 delivered messages at a high quality rating. At his volume the 250 limit is not a constraint.

### Coexistence — keeping his number in the app AND on the API

Meta's Coexistence ("Onboard WhatsApp Business app users") lets the same number stay in the WhatsApp Business app and work on the Cloud API at the same time, via a provider's Embedded Signup. One-to-one chats stay in sync on both sides; replies typed in the app stay free. Requirements: app version 2.24.17 or newer, and the number generally needs several days (commonly 7+, ideally 30–60) of genuine one-to-one activity in the app. During signup he scans a QR code in the app on his phone. Limits: 20 Cloud API messages per second, broadcast lists go read-only. This matters because his number must NOT be deleted from the app — Coexistence is the safe path for Route 2 and for Wati/Interakt/Zoko onboarding.

Sources:
- https://meetergo.com/en/magazine/whatsapp-business-api
- https://blog.getmanifest.ai/how-to-get-whatsapp-business-api/
- https://baat.ai/blog/whatsapp-business-api-access
- https://www.wati.io/en/blog/test-whatsapp-message-sends-safely/
- https://www.wati.io/en/blog/use-whatsapp-business-app-and-api-together/
- https://360dialog.com/blog/whatsapp-coexistence/

## What works WITHOUT business verification, and what verification needs

Without verification he CAN start: create portfolio, app, test number, register a real number (via Coexistence or after deleting the app account), and send/receive at the 250-customers-per-day tier. Verification is NOT a precondition to send the first message.

Without verification he CANNOT: raise the limit past 250/day by the verification path (the other paths still exist), or get the verified blue-check badge.

Business verification (in the portfolio's Security Centre) asks for documents proving the legal business: business registration certificate (SECP for a company, firm registration for a sole proprietor/partnership), a tax registration (in Pakistan, an FBR NTN certificate), and sometimes a utility bill or bank statement in the business name, plus a website on a matching domain. For a sole proprietor, Meta's own flow also commonly asks for a government-issued photo ID.

Verdict for Abdul: verification is BLOCKED right now. He has no CNIC, no NTN, no SECP/firm registration, no business bank account, and no custom domain. Getting an NTN from FBR is the realistic first document (it needs a CNIC to apply, so even that is blocked until he has ID). Do not start a verification application — it will fail and waste weeks. This does not block Route 1 or Route 2, because neither needs verification to start at his volume. Revisit verification only when daily volume approaches 250 customers or he wants the blue badge.

Sources:
- https://www.xenwap.com/blog/how-to-get-whatsapp-business-api
- https://convaify.com/whatsapp-business-api-pakistan.html
- https://oncloudapi.com/whatsapp-api-pakistan
- https://www.zoko.io/post/use-whatsapp-api-without-business-verification

## Meta message prices for Pakistan (rate card effective 1 October 2026)

Per delivered message, USD, customer's number is in Pakistan:
- Service reply (free-form answer inside the 24-hour window): first 1,000 per number per month free, then $0.015 (about Rs 4.15).
- Utility template (order confirm, dispatch update): $0.015.
- Authentication: $0.015. Marketing template (broadcasts, offers): $0.0473 (about Rs 13.10).
- Customer messages to the business are free.
- Volume tiers cut utility/authentication rates only at very high volumes (from 150,000/month) — irrelevant at his scale.
- Providers add their own margin on top (Wati about 20% above Meta; Interakt adds markup on some categories; Zoko passes Meta fees through at cost).

Example month at his scale: 200 customer chats, bot sends about 400 replies — all inside the free 1,000 service messages. Meta bill: $0. Ten utility templates (dispatch updates) = $0.15.

Sources:
- https://propakistani.pk/2026/09/15/meta-charges-pakistan-11x-more-than-india-for-whatsapp-business-messages/
- https://www.calypso.so/whatsapp-api-pricing/pakistan
- https://goaifusion.com/whatsapp-message-charges-pakistan

## AI rules on WhatsApp in 2026 (why his bot is allowed)

Since 15 January 2026 Meta bars general-purpose AI assistants from the WhatsApp Business Platform except in a short list of countries (Italy, Brazil, EEA, Türkiye). Pakistan is not on that list. But a business-specific bot that serves the business's own customers — answering questions about its own products, taking orders, confirming COD — is explicitly still allowed and encouraged. His bot only talks about Primetach watches, so it is inside the allowed use. It must also offer a prompt, clear handover to a human — FLOWS.md includes that.

Sources:
- https://digitthype.com/blog-post.php?post=ai-chatbot-whatsapp-agent-business-pakistan
- https://modelalmanac.com/how-to-set-up-an-ai-chatbot-for-whatsapp-business/

## Costs side by side (monthly, at low volume)

| Route | Platform cost | Meta message fees | Total at his volume |
|---|---|---|---|
| 1. Meta Business Agent | Rs 0 to start (Meta One paid tiers later, no Pakistan price published) | Rs 0 (inside free 1,000 service msgs) | Rs 0 |
| 2. Custom Cloud API build | VPS ~$5 (about Rs 1,400) + AI usage a few $ | Rs 0–50 | about Rs 1,500–3,000 |
| 3. Wati Growth (no-code, AI included) | $69/mo (about Rs 19,100); $59/mo annual (about Rs 16,300) | Extra, Wati rate card | about Rs 19,000+ |
| 3b. Interakt Growth + AI agent | $55 + $74.99 = about $130/mo (about Rs 36,000) | Extra + markups | about Rs 36,000+ |
| 3c. Zoko Starter + FAQ agent | $49.99 + $24.99 = about $75/mo (about Rs 20,800) | Meta fees at cost | about Rs 21,000+ |
| Unofficial (Baileys etc.) | Rs 0 | Rs 0 | Number ban risk — do not use |

Free trials: Wati — no free plan (7-day trial was reported on some pages, not confirmed on the pricing page; check at signup). Interakt — 14-day free trial on paid plans. Zoko — 7-day free trial, all features.

## Setup sequence (recommended order)

Step 1 — Abdul, 2 minutes, on his phone: update WhatsApp Business, open Tools, look for "Meta Business Agent". If it is there, Route 1 is live — stop here and configure it (Step 2). If it is not there, tell the assistant; go to Step 3.
Step 2 — Route 1 config (Abdul + assistant): add the business content the agent learns from — the FAQ list and price list in FLOWS.md, the website link https://primetachwaches.myshopify.com/, and the Facebook Page. Test it with sample questions from his own phone. Switch it on. Check the first real replies for a week and correct wrong answers (corrections teach it).
Step 3 — Route 2 prep (assistant): build the webhook server + AI bot with the flows in FLOWS.md, test end-to-end on Meta's free test number with Abdul's own phones as the 5 allowlisted recipients.
Step 4 — Abdul: confirm which app currently holds +92 313 0868882 (Business app or regular WhatsApp — after the 15 Nov migration this is unconfirmed) and confirm the number has genuine app activity. If it is not in the Business app, move it back first; Coexistence needs it there.
Step 5 — Abdul, on his phone, 10 minutes: Coexistence onboarding through the chosen provider (or direct Cloud API Embedded Signup) — scan the QR code in the Business app when asked, accept terms, decide whether to share chat history.
Step 6 — Assistant: point the bot at the real number, send a test message from a second phone, verify the bot answers and hands over correctly.
Step 7 — Abdul: watch the first week of real chats, correct mistakes, keep answering the handover chats himself. Bot stays off for anything it does not understand.

## What ONLY Abdul can do (needs his phone, his login, or his money)

1. Check Meta Business Agent in his WhatsApp Business app and switch it on (his phone, his app).
2. Confirm which app holds +92 313 0868882 right now, and move it to the Business app if it is not there (his phone, his SIM).
3. Any Meta/Facebook login: creating the Business portfolio, the developer app, and Embedded Signup (his Facebook account — the assistant never takes his password; he signs in himself, on his phone or in the cloud browser with his own tap).
4. Receive the OTP / scan the QR code during number registration and Coexistence onboarding (his phone, his number).
5. Approve any payment: a BSP subscription (Wati/Interakt/Zoko), a VPS, or Meta billing (his money, his card).
6. Business verification documents if ever needed (NTN/SECP/CNIC — he has none; nothing to submit yet).
7. Final say on the bot's wording and when it goes live (his business, his customers).

## What the assistant can do without him

Research, write all FAQ content and flows, build and test the webhook + AI bot on Meta's free test number, configure a BSP dashboard once he grants access, draft and submit message templates, monitor and fix wrong bot answers from the logs, and prepare the exact click-by-click steps for the parts above.

## Open checks before any build starts

- Is "Meta Business Agent" visible in his WhatsApp Business app? (Decides Route 1 vs Route 2.)
- Which app holds +92 313 0868882 today — Business app or regular WhatsApp? (Decides whether Coexistence is possible right away.)
- Does he want the bot to take orders end-to-end, or only answer questions and hand the order to him? (FLOWS.md assumes questions + order-taking with phone confirmation by him; confirm before building order capture.)
- No money to be spent and no account to be created until he picks a route and says start.
