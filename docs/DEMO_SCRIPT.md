# Three-minute ProveIt demo

Before the walkthrough, configure `server/.env` with Atlas or local MongoDB, set `DEMO_MODE=true`, then run `npm run seed` and `npm run dev`. The seeded password is `ProveItDemo2026!`.

## 0:00–0:35 · Start with the role

Open `/demo` and use **Startup**. The Fieldnote workspace has a seeded “Find the source of late orders” challenge. Show that it asks the owner to review and approve a rubric before candidates take it.

## 0:35–1:20 · Compare the evidence

Open the challenge leaderboard. “Genuine” explains the duplicate event handling and sample-size trade-off in terms that appear in the work. “Pasted” has a polished query, but gives general answers about checking results. Point to the low confidence indicator and the evidence-linked reasoning score; it is a confidence signal, not an accusation.

## 1:20–1:55 · Show human judgment

Open “Genuine” and show the quoted evidence and reasoned override form. A score can be overridden with a recorded reason. The list refreshes every five seconds and supports shortlist and review filters.

## 1:55–2:25 · Verify a badge

Use **Open sample badge** on `/demo`. Scan its QR code or open its public verification link. The page verifies the signed score and displays any mentor endorsement without exposing answer transcripts.

## 2:25–3:00 · Close the loop

Use the demo login buttons to open the anonymized mentor queue and the candidate opportunity feed. The seeded Founder Mode card shows a founder idea, a verified teammate, and a mentor connection.

## Cache-backed live path

For the stage flow, use the exact Junior Data Analyst description shown in the seeded challenge, then use the sample answer and three answer texts in `server/scripts/demoData.js`. The cache is keyed to those inputs, so the flow can complete without a live Anthropic key. Other prompts need a working Anthropic key or a matching cache entry.
