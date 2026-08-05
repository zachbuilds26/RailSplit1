# SETTLED.
## A RailSplit launch film — 82 seconds, pure black & white, 4K

*Editorial luxury. Swiss grid. Hairline borders. Typography is the hero.*

**Format:** 3840×2160 @ 24fps, monochrome only (#000000 / #FFFFFF / ~50% greys for hierarchy).
**Type:** Syne (headlines) · Space Grotesk (supporting) · tabular figures for every number.
**Grammar:** No gradients. No glow. No blur. No particles. No camera moves beyond a 2–3% push. All entrances use cubic-bezier(0.16, 1, 0.3, 1), 400–900ms. All exits use cubic-bezier(0.33, 0, 0.66, 1). The single 5-second signature drift (Scene 5) uses near-linear easing. Nothing bounces. Ever.
**Structure rhyme:** the film opens with a three-word totem and closes with a three-word totem. What was "asked" becomes "answered."

## MOTION GRAMMAR (applies to every scene)

Every scene must read as one continuous gesture, not a slide deck. The next scene's stage begins its 700ms opacity entry 600ms **before** the previous scene's stage begins its exit — animations overlap so the film never breaks rhythm.

- **Entrance easing:** `cubic-bezier(0.16, 1, 0.3, 1)` — fast start, long luxurious settle. Never linear, never bouncy.
- **Exit easing:** `cubic-bezier(0.33, 0, 0.66, 1)` — a quiet departure.
- **Draws (lines/rules):** `cubic-bezier(0.45, 0, 0.55, 1)`, transform-origin at the direction of travel, 800–1600ms.
- **Signature drift (the dot):** `cubic-bezier(0.4, 0, 0.6, 1)` over 5–9.5s — almost linear, weightless.
- **Camera:** implemented as a 2–3% scale on the scene content (`1.00 → 1.02`, 8–11s, linear). One direction per scene. Never both.
- **Fades:** 300–700ms, no blur, no translate on "heavy" moments (Scene 7 is pure opacity — the motionless scene is the memorable one).
- **Staggers:** entrances overlap their predecessor by 100–400ms; nothing waits for a dead stop.
- **Rules:** hairline = 1px. Confirmation flash = exactly 100ms at full white. Letter-spacing widens only on words that carry meaning (SETTLED, SURPLUS RETURNED, tags).

---

## FILM CONCEPT

**Title:** SETTLED.

**Thesis:** Trust is expensive. Payments currently make the customer trust a platform with custody, a rate with staleness, and a settlement with delay. RailSplit removes all three. What remains is a price, a link, a wallet — and the moment the money moves, it is settled.

**Narrative arc:**
1. **Question** — every payment begins with a question.
2. **Cost** — custody, waiting, uncertainty (the tax).
3. **Correction** — a price, a link, a wallet. Nothing else.
4. **Product** — the link itself: one stable dollar price, one breathing coin amount.
5. **Proof** — the dot travels the rail; the rate is read at confirmation; the money arrives; the surplus returns itself.
6. **System** — the merchant's ledger, rows that settle and stay.
7. **Promise** — price. promise. proof.
8. **Mark** — the wordmark, one line, release.

**Voice:** 6 lines, one per major beat, delivered slowly with long air between sentences. If VO is cut, the on-screen text alone carries the film.

---

## SCENE 1 — OPEN — "Every payment begins with a question."
**00:00 – 00:09 (9s)**

- **Objective:** Establish tension and weight in one breath. The audience should feel the question before they see a product.
- **Voiceover:** "Every payment begins with a question."
- **On-screen text:** *Every payment begins with a question.* — Space Grotesk, 44px, centered, 100% white, 0.14em tracking.
- **Visual composition:** Pure black frame. One hairline horizontal rule crosses the frame at 62% height, full width. A single 12px white dot enters from the left edge and travels along the rule.
- **Motion direction:** The rule fades from 0% to 100% scale on the X axis from frame center, expanding symmetrically left and right over 1.6s with cubic-bezier(0.45,0,0.55,1), beginning 0.5s after scene start; transform-origin is dead center. The dot begins at the frame's left edge and translates right toward the exact center at cubic-bezier(0.4,0,0.6,1) over 5s (starting at 2.0s), halting without overshoot at the 50% mark — no deceleration bump, it simply stops. The headline fades from 0% to 100% opacity over 0.7s while holding position (no translate), beginning at 1.0s, holds fully opaque for 5.8s, then dissolves 100%→0% over 0.4s at 7.5s.
- **Camera movement:** None. Static. The only motion is the dot's weightless drift.
- **Typography animation:** Single fade-in, 700ms, no slide. Text fades out 400ms at 00:07.5. The dot's arrival at center at 00:07 is the scene's punctuation.
- **Timing:** Text in 00:01–00:01.7 · dot travels 00:02–00:07 · text out 00:07.5–00:07.9.
- **Audio:** Sub-bass drone, -24dB, barely present. No hit.
- **Transition:** Scene stage fades 100%→0% over 700ms (0.16,1,0.3,1) at 00:08.9 while Scene 2's stage is already fading 0%→100% above it — a 1.3s overlap where both scenes are partially visible.

## SCENE 2 — THE TAX — "CUSTODY. WAITING. UNCERTAINTY."
**00:09 – 00:17 (8s)**

- **Objective:** Name the cost. Three words, one beat each — the film's first typographic performance.
- **Voiceover:** (optional) "So we wait for platforms. We wait for confirmations. We wait for trust."
- **On-screen text:** CUSTODY. → WAITING. → UNCERTAINTY. — Syne 800, 180px, left-aligned at 8% x, baseline anchored at 58% y.
- **Visual composition:** The hairline rule from Scene 1 remains as the anchor line. Words sit on it, left-aligned, forming a strict column. A 1px vertical rule marks the left edge at 8% x, 240px tall.
- **Motion direction:** Each word translates upward by 16px while fading 0%→100% over 0.7s with cubic-bezier(0.16,1,0.3,1), then holds perfectly still for 1.6s, then fades out over 0.3s — each word's 2.6s cycle starts 2.0s after the previous (0.8s / 2.8s / 4.8s delays), so words overlap each other's tail end by 300ms. The third word departs differently: at 00:15.2 it translates up 120px and scales to 70% while fading out over 0.9s — it lifts away rather than dissolving. Simultaneously a 1px white rule expands horizontally from 0% to 100% scale on the X axis, anchored at the word's left edge, over 0.9s with cubic-bezier(0.45,0,0.55,1), beginning at 00:15.2 — the "correction" draws across the word and travels with it as it lifts.
- **Camera movement:** None. The word column and the persistent hairline anchor keep the frame still.
- **Typography animation:** The signature beat — the strike draw. Everything else is quiet.
- **Timing:** CUSTODY. 00:09.2–00:10.9 · WAITING. 00:11.2–00:12.9 · UNCERTAINTY. 00:13.2–00:15.1 · strikethrough 00:15.2–00:16.1 · hold 00:16.1–00:16.5.
- **Audio:** Drone continues. One short, dry tick at the strikethrough start (00:15.2).
- **Transition:** Scene stage begins its 700ms fade-out at 00:17.1; Scene 3's stage begins its 700ms fade-in 600ms earlier at 00:16.4. The struck word's lift-away (00:15.2–00:16.1) plays directly into Scene 3's empty space — the eye follows the word up, finds the totem below it.

## SCENE 3 — THE TOTEM — "A PRICE. A LINK. A WALLET."
**00:17 – 00:26 (9s)**

- **Objective:** State the correction. The product is an act of subtraction — three objects, no middleman.
- **Voiceover:** "RailSplit removes the middle. There is only a price, a link, and a wallet."
- **On-screen text:** A PRICE. / A LINK. / A WALLET. — Syne 800, 110px, stacked at 8% x with 0.9 line-height. The struck UNCERTAINTY. from Scene 2 fades out fully during this scene.
- **Visual composition:** Black frame. The three lines form a typographic totem, top-aligned. At bottom-left, "RAILSPLIT" in Space Grotesk 14px, 20% white opacity, tracking 0.3em — the brand, half-present.
- **Motion direction:** The three lines translate upward by 12px while fading 0%→100% over 0.4s with cubic-bezier(0.16,1,0.3,1), staggering in at 0.5s intervals (00:18.0 / 00:18.5 / 00:19.0) — each line begins while the previous is still settling, no dead stops. A hairline rail draws from 0% to 100% X-scale from the left edge, 38% wide, over 1.6s with cubic-bezier(0.45,0,0.55,1) starting at 00:20.0. The whole scene content scales from 100% to 102% over 8.5s beginning at 00:18.4 — the barely-there push-in. At 00:25.0 the totem translates right by 12% of its width and scales to 92% while dimming to 30% opacity over 1.0s, making room for the card that is already assembling beneath it.
- **Camera movement:** 2% push-in (100%→102% scale, 8.5s, linear), starting at 00:19. Barely perceptible.
- **Typography animation:** Line 3 (A WALLET.) holds 400ms longer than the others — it is the resolution.
- **Timing:** Line 1 00:18.0 · Line 2 00:18.5 · Line 3 00:19.0 · rail draw 00:20.0–00:21.6 · hold to 00:25.5.
- **Audio:** Drone thins out. Near-silence for the totem.
- **Transition:** The totem's exit (00:25.0–00:26.0) overlaps Scene 4's card border which begins drawing at 00:26.6 — one continuous frame; the eye never catches a cut.

## SCENE 4 — THE LINK — the checkout card
**00:26 – 00:40 (14s)**

- **Objective:** Show the product as an object. The whole film's centerpiece: one card, one stable dollar price, one coin amount that breathes with the live rate.
- **Voiceover:** "One link. One price. One payment." (three phrases, one per visual beat)
- **On-screen text:** Card contents: "Sample Checkout" (Space Grotesk 16px, 60% white) · "$0.25" (Syne 800, 96px, tabular) · "C2FLR" (Space Grotesk 12px, 60%) · "Pay" (hairline button, 100% white).
- **Visual composition:** Rounded card, 420px wide, 1px hairline border, 24px radius, pure black fill on pure black frame — defined by its border alone. Behind it, the site's grid-fade at 3% white opacity. Card center at 56% height.
- **Motion direction:** The card's 1px rounded border draws itself via stroke-dashoffset from 1→0 over 0.9s with cubic-bezier(0.45,0,0.55,1) starting at 00:26.6 — the stroke begins at the top-left corner and wraps the full perimeter. The title fades 0%→100% over 0.4s at 00:28.2 with no translate. The price "$0.25" translates up 16px while fading in over 0.6s at 00:29.0 (0.16,1,0.3,1). The coin line fades in over 0.4s at 00:30.0. The Pay button fades 0%→100% while scaling 98%→100% over 0.5s at 00:30.9. The grid-fade backdrop (3% white) fades in over 1.0s at 00:26.4.
- **Camera movement:** None. Static.
- **Typography animation — THE HERO BEAT:** The coin amount is a ticker: "41.57" → "41.62" → "41.57". Each digit change is a fresh span translating up 14px while fading in over 0.5s (0.16,1,0.3,1) — the number breathes twice and returns, as if correcting itself. At 00:33.4 a 1px underline expands horizontally from its center over 0.8s beneath the settled amount. The price is the promise; the amount is the weather.
- **Timing:** Card 00:26.6–00:27.5 · title 00:28.2 · price 00:29.0 · coin line 00:30.0 · tick 1 00:31.0–00:31.5 · tick 2 00:32.0–00:32.5 · underline 00:33.4–00:34.2 · hold to 00:38.2.
- **Audio:** Three soft ticks (not clicks — felt, not heard loudly) on card draw, tick 1, tick 2. Drone returns quietly.
- **Transition:** At 00:38.2 the card translates up 60px while dimming to 30% opacity over 0.9s (exit curve) — the interface releases — and Scene 5's stage is already fading in above it from 00:38.8.

## SCENE 5 — THE SETTLEMENT — the signature sequence
**00:40 – 00:52 (12s)**

- **Objective:** Show the money moving. This is the film's single most remembered image — the dot on the rail.
- **Voiceover:** "When it confirms, the rate is read — and the money moves straight to the merchant."
- **On-screen text:** Small labels only: "RATE READ" (top, left of rail center) · "MERCHANT WALLET" (bottom right). Space Grotesk 12px, 60% white, 0.2em tracking.
- **Visual composition:** Pure black. The horizontal rail from Scene 3 returns at 50% height. At rail center, a 1px vertical hairline (the confirmation line). The dot from Scene 1 re-enters at the left.
- **Motion direction — the signature:** The rail draws from 0% to 100% X-scale from frame center over 1.6s (0.45,0,0.55,1) at 00:40.0. The dot enters from the left edge at 00:41.0 and travels the full width of the rail at cubic-bezier(0.4,0,0.6,1) over 9.5s — weightless, no acceleration curve you can feel. At 00:46.0 it crosses the vertical confirmation line: the line flashes from 25% to 100% white opacity in 100ms and back to 25% in 100ms. The dot arrives at 00:50.5 and scales from 100% to 167% while fading to 0% over 0.3s — it expands and dissolves where it lands. "SURPLUS RETURNED — 0.00" fades in while its letter-spacing widens from 0.1em to 0.28em over 0.6s at 00:51.0 — the widest tracking in the film, reserved for this word. Scene content scales 100%→102% over 11s.
- **Camera movement:** 2% push-in on the rail over the scene.
- **Typography animation:** "SURPLUS RETURNED" letter-spaces from 0.1em to 0.28em over 600ms — the widest tracking in the film, reserved for this word.
- **Timing:** Dot starts 00:41.0 · passes line 00:46.0 · flash 00:46.0–00:46.2 · arrives 00:50.5 · circle 00:50.5–00:50.8 · surplus text 00:51.0–00:51.6 · hold to 00:52.0.
- **Audio:** A single, clean confirmation tick at 00:46.0. Then silence. The film's quietest moment is its most confident.
- **Transition:** The black stage fades to 0% over 900ms at 00:52.1 while Scene 6's pure white stage fades in above it — the dot's expanding circle, now black, survives the inversion for half a second.

## SCENE 6 — THE SYSTEM — the ledger (inverted)
**00:52 – 01:02 (10s)**

- **Objective:** One payment was a proof. Many are a system. The white inversion says: now we're official.
- **Voiceover:** "The merchant sees every settlement. The customer sees one number."
- **On-screen text:** "SETTLED" (Syne 800, 64px, 8% black, top-left of card) · Ledger rows: "RAIL — $0.12 — SETTLED" · "ARCADE RUN — $0.25 — SETTLED" · "PRESSURE — $0.02 — SETTLED" (title 16px Space Grotesk 800, amount 16px tabular, tag 10px with hairline border).
- **Visual composition:** Full white frame. One rounded card (1px black hairline, 420px wide, centered) containing the word SETTLED and three hairline rows, each with a small bordered "SETTLED" tag.
- **Motion direction:** The card fades 0%→100% while scaling from 96%→100% over 0.8s at 00:53.0 (0.16,1,0.3,1). "SETTLED" fades in while its letter-spacing widens 0.1em→0.24em over 0.5s at 00:53.4. The three rows each translate up 12px while fading in over 0.5s, staggered 400ms (00:55.0 / 00:55.4 / 00:55.8) — each row starts rising while the previous row is still 20% transparent. Each bordered tag fades in 300ms after its row with the same tracking widen, 100ms staggered. At 00:61.0 the card translates down 120px while fading to 0% over 0.8s (exit curve) — it descends out of frame, and the white frame holds alone for 0.5s.
- **Camera movement:** None. Static. The white frame is the statement.
- **Typography animation:** The tag tracking widen is the detail; the black-on-white inversion is the moment.
- **Timing:** Card 00:53.0–00:53.8 · SETTLED 00:53.4 · row 1 00:55.0 · row 2 00:55.4 · row 3 00:55.8 · tags trail 00:55.3/00:55.7/00:56.1 · hold to 00:61.0.
- **Audio:** Silence.
- **Transition:** Card slides down 120px and out over 800ms (00:61.0–00:61.8). White frame holds alone 0.5s, then Scene 7's black stage fades in above it over 700ms from 00:61.4 — the white-to-black pass is as deliberate as the black-to-white one.

## SCENE 7 — THE PROMISE — "PRICE. PROMISE. PROOF."
**01:02 – 01:12 (10s)**

- **Objective:** The thesis, said once. The structural rhyme with Scene 3 — three words opened the film, three close it.
- **Voiceover:** "The price is the promise. The settlement is proof."
- **On-screen text:** PRICE. / PROMISE. / PROOF. — Syne 800, 140px, centered, stacked. PROOF. holds longest.
- **Visual composition:** Pure black. Nothing else. No rules, no dots, no card. The film strips to type at its most naked.
- **Motion direction:** Pure opacity fades only — each word goes 0%→100% over 0.4s (0.16,1,0.3,1) with zero translate, staggered 700ms (00:63.0 / 00:64.1 / 00:65.2). Heavier words don't move; they arrive. At 00:69.6 the entire stack fades 100%→0% over 0.7s (exit curve), leaving two seconds of unbroken black.
- **Camera movement:** None. Zero. The most motionless scene is the most memorable.
- **Typography animation:** PRICE. fades in · PROMISE. fades in below · PROOF. fades in last and holds 2.4s.
- **Timing:** PRICE. 01:03.0–01:03.4 · PROMISE. 01:04.1–01:04.5 · PROOF. 01:05.2–01:05.6 · hold to 01:09.6 · all fade 01:09.6–01:10.3.
- **Audio:** Drone returns for 4s, then cuts mid-note to silence at 01:10 — the cut itself is the transition.
- **Transition:** Stack fades out at 00:69.6; black holds until Scene 8's stage begins fading in at 00:71.4 — three seconds of nothing. Then the mark.

## SCENE 8 — THE MARK — the end card
**01:12 – 01:22 (10s)**

- **Objective:** Close like a company worth a billion dollars: name, line, proof, stop.
- **Voiceover:** "RailSplit." (single word, after 2s of silence)
- **On-screen text:** RAILSPLIT (Syne 700, 88px, letter-spacing 0.08em, centered) · "One link. Clear payments." (Space Grotesk 18px, 60% white) · "Now live — Coston2 testnet" (Space Grotesk 12px, 40% white, bottom of frame).
- **Visual composition:** Centered stack. A 1px white line draws beneath the tagline, centered, 220px wide.
- **Motion direction:** Each letter of the wordmark fades 0%→100% over 0.3s (0.16,1,0.3,1), staggered 40ms per letter starting at 00:74.0 — a 360ms ripple across nine letters, the only letter-by-letter moment in the film, reserved for the brand. The tagline fades 0%→100% over 0.6s at 00:75.0 with no translate. A 220px-wide rule expands horizontally from 0% to 100% scale from its center over 0.8s (0.45,0,0.55,1) at 00:76.0. The controls fade in over 0.5s at 00:78.0. The end card holds; there is no fade-out — the film stops.
- **Camera movement:** None.
- **Typography animation:** Letter stagger + the drawn rule. That's all.
- **Timing:** Wordmark 00:74.0–00:74.4 · tagline 00:75.0–00:75.6 · rule 00:76.0–00:76.8 · hold indefinitely.
- **Audio:** Silence. One tick at the rule's completion (00:76.8). Then silence.
- **Transition:** None. The film simply stops on the mark. The stop is the confidence.

---

## VOICEOVER MASTER SCRIPT (optional track, 6 lines)

> "Every payment begins with a question."
> "So we wait for platforms. We wait for confirmations. We wait for trust."
> "RailSplit removes the middle. There is only a price, a link, and a wallet."
> "One link. One price. One payment."
> "When it confirms, the rate is read — and the money moves straight to the merchant."
> "The price is the promise. The settlement is proof."
> "RailSplit."

Read slowly. 1.5–2.0s of air after every sentence. No music bed, or a single sustained sub-bass drone at -28dB. The film's confidence is in its silence.

---

## BUILD NOTES FOR THE NEXT SESSION

- **Implementation:** one HTML/React timeline (GSAP or Framer Motion), rendered at 3840×2160/24fps, or animated directly on the RailSplit landing page as a scroll/scene sequence. The full film can also be a `<section>` on the homepage above the fold.
- **Assets needed:** Syne (400/700/800) + Space Grotesk via `next/font`; nothing else — the entire film is type, hairlines, one dot, one card.
- **Keyframe constants:** entrance `cubic-bezier(0.16, 1, 0.3, 1)` 400–900ms · exit `cubic-bezier(0.33, 0, 0.66, 1)` · signature drift 5s near-linear · confirmation flash exactly 100ms.
- **Verification:** every frame must contain only #000000, #FFFFFF, and grey between 20% and 60%. No blur, no glow, no gradient — grep the code for `filter`, `blur`, `glow`, `radial`, `linear-gradient` before shipping.
