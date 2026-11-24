# WhatsApp Bot — Reply Flows (Primetach Watches)

Bot ki zaban: Roman Urdu, short aur seedhi, jaise Abdul khud likhta hai. Neeche wale jawab uske apne 8 templates se liye gaye hain (customer-reply-templates.md, Oct 2026), sirf facts update kiye gaye hain: golden Rs 3,499, black Rs 2,999, free delivery 5–6 din, 7-day exchange, order confirm call 0313 0868882 se.

Bot ke usool:
- Ek sawal ka ek jawab. Lambi list na bhejo.
- Price hamesha dono watches ki do, jab tak customer ek ka naam na le.
- Order lene se pehle 4 cheezein lo: naam, mobile number, poora address, city.
- Koi jhootha wada nahi: "aaj hi mil jaye ga" ya "100% waterproof" kabhi nahi.
- Jo samajh na aaye, us par andaza nahi — seedha Abdul ko handover karo. (AI on ho to pehle AI jawab dega, AI-KNOWLEDGE.md se; AI band ho ya fail ho jaye to handover.)
- Customer aksar bohat kuch poochta hai — flows 13–24 mein aam sawalon ke jawab bhi likhe hain. Jo baat kisi flow mein nahi, us par andaza nahi — handover karo.

## 1. Greeting — pehli baar message kare

Assalam o Alaikum, Primetach Watches mein khush aamdeed. Hamare paas men's watches hain, cash on delivery puray Pakistan mein. Golden watch Rs 3,499, black watch Rs 2,999. Order ke liye apna naam, address aur city bhej dein.

## 2. Price poochhe ("price?", "kitne ki hai?", "rate")

Golden watch Rs 3,499 hai, black watch Rs 2,999 hai. Dono cash on delivery hain, delivery free hai, puray Pakistan mein. Konsi wali chahiye, golden ya black?

Agar ek ka naam le: "Golden watch Rs 3,499 hai, cash on delivery, free delivery 5–6 din mein. Order karna ho to naam, address aur city bhej dein."

## 3. Order karna ("order karna hai", "mujhe ye chahiye")

Shukriya, order ke liye ye details bhej dein:
Naam:
Mobile number:
Poora address:
City:
Konsi watch: Golden (Rs 3,499) ya Black (Rs 2,999)?

Details milne par: "Shukriya, apka order note kar liya hai. Hum 0313 0868882 se call kar ke confirm karein ge, phir parcel bhej dein ge. Parcel milne par cash dena hoga, pehle koi payment nahi."

## 4. Delivery time ("kab mile ga?", "delivery kitne din?")

Free delivery 5–6 din mein ho jati hai, puray Pakistan mein. Parcel dispatch hote hi apko tracking number yahin bhej dein ge.

## 5. Order kahan hai ("mera order kahan hai?", "tracking")

Agar tracking number hai: "Apka parcel bhej diya hai. Tracking number: [ ]. Is number se ap apna parcel track kar sakte hain. Delivery par cash tayyar rakhiye ga."

Agar tracking nahi hai: "Apka order check kar ke batata hun, thori der mein jawab deta hun." Phir Abdul ko handover karo — bot tracking number khud nahi bana sakta.

## 6. Exchange / return ("kharab nikli", "wapis karni hai", "change karni hai")

"Afsoos hua. Ghalat ya kharab watch 7 din ke andar exchange ho jaye gi. Watch ki photo yahin bhej dein, hum check kar ke exchange kar dein ge."

Note: change of mind par return nahi hai — sirf ghalat ya kharab par 7-day exchange. Bot ye wada na kare ke "paisay wapis mil jayein ge".

## 7. Waterproof / quality ("waterproof hai?", "quality kaisi hai?")

"Ye watch water resistant hai, roz ke istemal aur halki barish ya haath dhone mein masla nahi. Swimming ya garam pani mein istemal na karein."

## 8. Discount ("discount do", "kam karo")

"Sir, price pehle se hi kam rakhi hai aur delivery par bhi koi extra charges nahi le rahe. Quality dekh kar apko price theek lage gi, cash on delivery hai, parcel milne par hi paisay dein."

## 9. Payment ("advance?", "JazzCash?", "online payment?")

"Cash on delivery hai, parcel milne par hi paisay dein. Pehle koi payment nahi karni."

## 10. Away — raat ya college time par message aaye

"Assalam o Alaikum, abhi hum available nahi hain. Apna sawal yahin likh dein, shaam ko jawab de dein ge. Shukriya."

## 11. Samajh na aaye — handover

Bot ko sawal samajh na aaye, ya customer ghusse mein ho, ya aisi baat ho jo flows mein nahi:

"Ye sawal main Abdul ko bhej raha hun, wo khud jawab dein ge. Thori der intezar karein, shukriya."

Handover ke baad bot us chat mein dobara na bole jab tak Abdul khud na kahe ya naya sawal na aaye. Handover wali chat Abdul khud dekhe ga.

## 12. Follow-up — reply na aaye to, sirf aik dafa

"Assalam o Alaikum, ap ne watch ke baray mein poocha tha. Stock mehdood hai, order confirm karna ho to naam aur address bhej dein, cash on delivery hai."

Sirf aik dafa bhejna hai, baar baar nahi. Aur sirf un ko jinhon ne khud pehle message kiya tha.

## 13. Designs / catalogue / photo dikhao ("aur designs dikhao", "photo bhejo", "tasveer dikhao")

"Saare designs aur photos yahan dekhein: https://primetachwaches.myshopify.com/ — Golden watch Rs 3,499, Black watch Rs 2,999. Jo pasand aaye uska naam bhej dein, order kar dein ge."

## 14. Shop kahan hai ("shop kahan hai", "location", "Quetta mein kahan")

"Hamari shop Quetta mein hai, Ani-din Street, Masjid Road. Online order puray Pakistan mein cash on delivery par ho jata hai."

## 15. Ladies / bachon ki watch ("ladies watch hai?", "bachon ki hai?")

"Hum sirf men's watches bechte hain, ladies ya bachon ki watches nahi hain."

## 16. Original / brand ("original hai?", "copy hai?", "Rolex hai?")

"Ye BOPHIERI brand ki watch hai. Ye Rolex ya kisi aur brand ki copy nahi hai."

## 17. Strap / material ("strap kaisa hai", "chain kaisi hai")

Golden ka naam le: "Golden watch ki chain stainless steel ki hai."
Black ka naam le: "Black watch ka strap rubber ka hai."
Dono ya koi naam na le: "Golden watch ki chain stainless steel ki hai, black watch ka strap rubber ka hai."

## 18. Order cancel ("order cancel karna hai")

"Order cancel karna ho to bata dein. Agar parcel dispatch nahi hua to order cancel kar dein ge."

Note: ye baat Abdul ko bhi jati hai — bot is ke baad khamosh rehta hai jab tak Abdul khud na kahe.

## 19. Address badalna ("address change karna hai")

"Naya address bhej dein, hum note kar lein ge aur parcel naye address par bhej dein ge."

Note: ye baat bhi Abdul ko jati hai.

## 20. Confirm call kab aye gi ("call kab aye gi", "confirm call")

"Order ke baad hum 0313 0868882 se call kar ke confirm karein ge, phir parcel bhej dein ge."

## 21. Wholesale ("wholesale rate kya hai", "bulk mein chahiye")

"Wholesale ke liye Abdul se baat karni hogi, ye sawal un ko bhej raha hun."

Note: handover.

## 22. Facebook / Instagram / website ("page ka link bhejo", "website kya hai")

"Hamara Facebook page: facebook.com/primetachwatches — Instagram: @primetach_watches — Website: https://primetachwaches.myshopify.com/"

## 23. Watch ki tafseel ("details batao", "kya kya hai is mein")

"Golden watch: stainless steel chain, Rs 3,499. Black watch: rubber strap, Rs 2,999. Dono water resistant hain, cash on delivery hai, free delivery 5–6 din mein."

## 24. Shop timing ("timing kya hai", "kab khulta hai")

"Hamari online shop har waqt khuli hai — order kabhi bhi kar sakte hain. Call par confirmation din mein hoti hai."

Note: size (mm), battery, automatic, date — ye tafseel flows mein nahi hai, is liye bot is par andaza nahi lagaye ga, seedha Abdul ko bhej de ga.

## Bot ko ye kabhi nahi karna

- Kisi dost ya personal chat mein jawab nahi dena — sirf business number par aane wale customer messages.
- Price kam karke nahi batani, delivery "2 din" nahi kehni, "100% waterproof" nahi kehna.
- Order confirm kiye baghair parcel nahi bhejna — har order pehle 0313 0868882 se call par confirm hota hai.
- Customer ka number ya address kisi aur ko nahi dena.
- Raat 9 ke baad naya marketing message nahi bhejna.
