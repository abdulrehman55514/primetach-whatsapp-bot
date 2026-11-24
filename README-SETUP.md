# WhatsApp Bot — Setup (Primetach Watches)

Bot ban gaya hai aur local test pass hai (36/36, do baar check kiya). Ye file batati hai ke
aage kya karna hai. Poora plan PLAN.md mein hai, jawab FLOWS.md mein hain.

## Files

- `server.js` — the bot. Node.js, zero dependencies. Webhook + reply logic.
- `ai.js` + `AI-KNOWLEDGE.md` — optional AI layer (Gemini free tier) for
  questions no flow covers; only answers from the facts in AI-KNOWLEDGE.md.
- `test-local.js` — local test. Bina Meta account ke chalta hai.
- `PLAN.md` — research, routes, prices, Meta steps.
- `FLOWS.md` — bot ke jawab (single source of truth).

## Bot kya karta hai

- Price, delivery (5–6 din), exchange (7 din), waterproof, discount,
  payment (sirf COD) — FLOWS.md ke fixed jawab, lafz ba lafz.
- Aam sawal bhi cover hain (kul 24 flows): designs dekhna, shop kahan hai,
  ladies watch, original/brand, strap/material, order cancel, address
  badalna, confirm call, wholesale, Facebook/website, tafseel, timing.
  Size/battery/automatic/date jaise sawal jinki tafseel flows mein nahi —
  bot andaza nahi lagata, Abdul ko bhej deta hai.
- Fixed jawab pehle: price, delivery, exchange jaise sawal FLOWS.md se
  lafz ba lafz. Koi sawal kisi flow mein na ho to AI jawab deta hai
  (neeche "AI jawab" dekho) — key na ho to Abdul ko handover hota hai.
- Order leta hai: naam, mobile, address, city, golden/black — phir
  confirmation bhejta hai aur order `data/orders.json` mein save karta hai.
  Parcel sirf Abdul ki call-confirmation ke baad bhejna hai — bot khud
  parcel nahi bhejta.
- Jo sawal AI bhi na samajh sake, tracking number na ho, ya customer ghusse mein
  ho — Abdul ko handover karta hai aur phir khamosh rehta hai jab tak
  naya sawal na aaye.
- Raat 10 se subah 8 tak pehle message par away reply bhejta hai.
  Band karna ho to `AWAY_HOURS=off` set karo.

## AI jawab (optional — GEMINI_API_KEY)

Abdul ne kaha hai: random sawal bhi bot khud apni samajh se jawab de, Abdul
ko na bheje. Is liye `ai.js` hai — Google Gemini free tier se jawab deta
hai, sirf un sawalon par jo kisi flow mein nahi aate. Fixed flows hamesha
pehle chalte hain; order lena, price, delivery sab wahi rehte hain.

- Key free hai: aistudio.google.com kholo, Google account se sign in karo,
  "Get API key" dabao, key copy karo. Card nahi chahiye.
- Server start karte waqt `GEMINI_API_KEY=apni-key` set karo. Model
  `gemini-3.5-flash-lite` hai (free tier, daily limit hoti hai — chhoti shop
  ke liye kaafi). Model badalna ho to `GEMINI_MODEL=...` set karo.
- AI sirf `AI-KNOWLEDGE.md` ki facts se jawab deta hai. Price, delivery ke
  din, ya size/battery jaise specs kabhi invent nahi karta — jo tafseel
  file mein nahi, us par kehta hai ke Abdul check kar ke batayenge. Size
  ya battery ki asli tafseel Abdul de de to file mein add kar dunga, phir
  AI wo bhi khud bataye ga.
- Free tier par customer ke message Google ko jate hain (Google apne
  products behtar karne ke liye use kar sakta hai). Is liye customer ka
  number/address AI ko kabhi nahi bheja jata — order details sirf fixed
  flow se save hote hain.
- Key na ho to bot pehle jaisa hi chalta hai: unknown sawal Abdul ko
  handover. AI fail ho jaye (limit ya network) to bhi handover, bot
  kabhi crash nahi karta. Test mein ye sab check hai (mock Gemini server).

## Local run + test

```bash
cd ~/workspace/whatsapp-bot
node test-local.js   # 36 checks, sab pass hone chahiye
```

Asli run (token ke baghair ye dry-run mode mein chalta hai — jawab
screen par likhta hai, Meta ko kuch nahi bhejta):

```bash
PORT=3000 VERIFY_TOKEN=apna-token APP_SECRET=meta-app-secret \
WHATSAPP_TOKEN=permanent-token PHONE_NUMBER_ID=number-id \
node server.js
```

## Live karne ke steps (Abdul ke baghair nahi ho sakte)

1. **Meta app (Abdul, uska Facebook login):** developers.facebook.com par
   developer account, business.facebook.com par Business portfolio, phir
   Meta app (type: Business) + WhatsApp product. Meta foran ek free test
   number aur 24-hour token deta hai.
2. **Test number:** test number par 5 numbers allowlist karo (OTP se) —
   sirf apne phones. Asli customers ko test number se message nahi ja sakta.
3. **Hosting — public HTTPS URL chahiye:** sab se sasta rasta Render free
   web service hai (Node app, free tier, sota hai jab koi message na aaye)
   ya ~$5/month VPS. Code ko GitHub par dalna hoga, phir Render se connect
   karna hoga. Dono kaam Abdul bataye to kar dunga.
4. **Webhook Meta mein lagao:** URL `https://tumhara-server/webhook`,
   verify token wohi jo server mein `VERIFY_TOKEN` hai. Webhook field
   `messages` subscribe karo.
5. **Permanent token:** portfolio mein System User banao, permanent token
   lo. 24-hour test token production mein kabhi use nahi karna.
6. **Test:** apne phone se test number par message bhejo — price poocho,
   phir order karo. Orders `data/orders.json` mein check karo.

## Real number (+92 313 0868882) par kab aaye ga

Abhi nahi. Pehle test number par sab theek kar lo. Real number ke liye
Coexistence chahiye — number WhatsApp Business app mein bhi rahe aur API
par bhi. Us ke liye number ko Business app mein hona zaroori hai aur us par
kuch din ki asli chat activity. Ye step us waqt karenge jab test pass ho
jaye. Number ko app se delete karke API par register karna **mat** karo —
wo rasta chats khatam kar deta hai.

## Abhi baki hai

- Meta app + test number + hosting (upar steps 1–4) — Abdul ke login aur
  hosting choice ke baghair nahi ho sakta.
- AI on karna ho to free Gemini key (Abdul ka Google account, 2 minute,
  aistudio.google.com) — key ke baghair bot fixed jawab + handover par
  chalta hai. Code tayyar aur test pass hai.
- Follow-up flow (FLOWS.md flow 12, aik dafa nudge) — is ke liye Meta se
  approved template + aik scheduler chahiye, baad mein banega.
- Orders ki notification: abhi orders file mein save hote hain. Abdul
  chahe to bot order milte hi us ko WhatsApp par bata de — ye test ke
  baad aik line ka kaam hai.
