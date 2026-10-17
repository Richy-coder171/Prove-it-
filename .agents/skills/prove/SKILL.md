---
name: prove
description: 'Evidence over assertion. Before claiming anything works — a fix, a feature, a build, a performance number, a "should be fine" — run it and show the proof: command + real output, failing test turned green, screenshot of the UI in a real browser, before/after measurement. Use whenever you finish a change, report results, or are tempted to write "tested", "works", "should work", "fixed" or "no errors" without evidence. Also use when the user asks you to prove, verify, confirm, double-check or demo something.'
---

# Prove it

A claim without evidence is a guess wearing the word "tested". This skill makes you produce the proof
before you make the claim, and label the claim honestly when proof is impossible.

## The one rule

Never write `works`, `fixed`, `tested`, `no errors`, `should work`, `passes` or `done` unless you
have executed something in this session that demonstrates it — and then paste the evidence in the
same reply, directly under the claim.

The evidence must be a real artifact from this session: a command with its actual output, a test run
with its actual result, a screenshot taken in a real browser, a log line, a before/after number.
Not a description of what the command would do. Not a paraphrase of what you expect.

## Evidence levels

Label every result with the strongest level you actually reached:

- **A — Observed.** You ran it and watched the output. This is the only level that supports the word
  "works".
- **B — Statically checked.** Typecheck, lint, build, `--check`, a parser. It proves the code is
  well-formed, not that it behaves. Say "compiles clean", never "works".
- **C — Reasoned.** You read the code and believe it is correct. Say so plainly: *"not run — reasoned
  only"*. C is a legitimate answer; a C presented as an A is not.

## How to get to A

Pick the cheapest proof that actually distinguishes working from broken. Do not build a test harness
to prove a one-line change, and do not reason about output you could have printed.

**Code / bug fix**

1. Reproduce first. Capture the failing behavior — the failing test, the error output, the wrong
   screenshot. A fix you never saw fail proves nothing; if you cannot reproduce the bug, say that
   before you change anything.
2. Make the change.
3. Re-run the exact same check. Show failing before, passing after, side by side.
4. Run the surrounding tests too — the ones your change could plausibly break, not the whole suite
   when it is slow. Name which you ran.

**CLI / script / API**

```text
$ <the command you claim works>
<real stdout/stderr, exit code if it matters>
```

Run the command a user would run, from the directory they would run it in, with the arguments they
would use. Include the failing path at least once (bad input, missing file, empty result) — success
on the happy path only is a B-grade claim about error handling.

**UI / frontend**

Start the real thing (dev server or built output), open it in a browser, and look at it:

- Screenshot the state you are claiming about — the element, the interaction after the click, the
  responsive width you say you fixed.
- Read the browser console and the network panel. "Looks fine" plus four red console errors is a
  failed proof.
- Exercise the interaction: click it, submit it, resize to mobile, reload. A static screenshot of an
  untested page is not proof of behavior.

**Build / deploy / config**

Run the actual build or deploy, or the config's own validation, and show the result. Then show that
the artifact exists and is the one you expect (file listing, version output, `--help`, a request to
the running service).

**Performance / size claims**

Numbers need a measurement, not an impression: the command that measures, the number before, the
number after, and what else was equal (same machine, same input). If you estimated, say "estimated".

## Format in your reply

Keep it short — one block, then move on:

```text
Proof (A — observed):
  $ npm test -- picker
  12 passed, 0 failed  (was: 1 failed — "TypeError: cannot read 'id' of undefined")
  $ npm run build
  built in 4.2s
```

For a UI change, drop in the screenshot you took instead of a transcript.

## When proof is impossible

Some things cannot be run here: hardware, third-party APIs without credentials, other people's
environments, rollback of production data. Then state the limit in one line instead of hedging:

> Not proven: needs a Stripe test key. Reasoned from the SDK docs (C).

Then prove whatever part you *can* — the request body your code builds, the JSON it would send, a
mocked call — and label that level honestly. Partial evidence with a stated gap beats a confident
sentence with nothing behind it.

## Hard rules

- If the proof fails, do not soften the claim. Fix it, re-run, and show the new output. A failed proof
  you hid is worse than the original bug.
- Never fabricate, reconstruct from memory, or "clean up" output. Paste what the terminal actually
  printed, including the ugly parts.
- One honest failure in the log is more informative than five passing checks that never touched the
  change. Prove the risky path, not the easy one.
- If the user asked for proof of a specific claim, answer that claim directly: proven, refuted, or
  not provable here. Do not substitute a different, easier claim.
- Getting to A usually takes one command. If you find yourself writing a paragraph explaining why
  you did not run it, run it.
