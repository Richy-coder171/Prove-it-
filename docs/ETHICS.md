# ProveIt ethics and privacy

ProveIt is designed around evidence, human review, and clear limits on what AI assesses. These are product principles, not a claim of legal compliance.

## People make decisions

- A startup reviews and approves every challenge before it becomes public.
- Grading is advisory. Startups can record a reasoned score override, and candidates can request a human re-review.
- Authenticity describes confidence that a defense matches submitted work. It is not an accusation and should not be used as a standalone hiring decision.

## Content-only scoring

- Graders receive the written answer and defense transcript. They do not receive candidate names, email addresses, profile data, or audio.
- Face, voice tone, accent, appearance, and demographic traits are not analyzed.
- A candidate can type an answer, use browser speech input, or record audio where transcription is configured.
- Audio is private and streamed only through an authenticated owner route. Candidates can delete a stored audio recording; the transcript remains part of the scored submission so the review remains explainable.

## Evidence and retention

- Criterion feedback includes quotes checked against the answer or transcripts. Unsupported evidence is dropped and unsupported high scores are capped.
- Candidates can view their result and request a human re-review.
- Deployers should set and publish a retention schedule for submitted work and transcripts that fits their use. ProveIt does not currently provide account-wide deletion or automatic expiration.

## Regulatory awareness

Some hiring uses of AI may trigger specific requirements. The EU AI Act lists certain recruitment and candidate-selection systems in Annex III, and New York City Local Law 144 imposes audit and notice requirements for covered automated employment decision tools. Applicability depends on the system and how it is used; ProveIt does not claim compliance. Organizations should obtain qualified advice for their jurisdictions and intended use.

- [EU AI Act, Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj), Annex III.
- [New York City DCWP: Automated Employment Decision Tools](https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page).
