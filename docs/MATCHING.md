# Matching engine

CampusFix uses a deterministic, rule-based fuzzy matching engine. It is not an AI model, does not use embeddings, and must never be treated as proof that two reports describe the same item or that a person owns an item.

## Eligibility and execution

Creating or materially editing an active lost or found report evaluates that report against active reports of the opposite type only. Private reports are intentionally included in this internal operation, but are not exposed by the public lost-item feed. Archived reports and administrator-held reports are excluded.

Each eligible lost/found pair has at most one `Match` record because `{ lostItem, foundItem }` has a unique index. Subsequent engine runs update its scores instead of creating duplicates. If an automatic candidate later falls below the threshold after an edit, or either report is held/archived, it is marked `dismissed`; reviewed statuses are not overwritten.

The current implementation performs a bounded MongoDB query after an item is saved. This is suitable for a small campus deployment, but it is O(number of active opposite-type reports) per report. At larger scale, use category/date pre-filtering and move the service call to a durable queue. The service boundary is deliberately separate from notification and chat integrations; no alert or conversation is fabricated by this module.

## Text scoring

For title, description, category, and location, text is lowercased, Unicode-normalized, stripped of punctuation, collapsed to whitespace, tokenized, stripped of a small English stop-word list, and Porter-stemmed with `natural`. Each field combines:

- Jaro-Winkler similarity of normalized strings (55%)
- Average best-token Jaro-Winkler similarity of stemmed tokens (45%)

Title contributes 60% and description 40% to the text component. Category and location are independently scored using the same field method. Every component is normalized to 0.00–1.00.

## Image scoring

When an image is uploaded, the server validates it and uses `sharp` to decode it, resize it to a 32×32 grayscale image, calculate the low-frequency 8×8 2-D DCT coefficients, threshold them at their median, and save the resulting 64 bits as a 16-character hexadecimal perceptual hash. The client never supplies or approves this hash.

Hamming distance is the differing-bit count in two valid 64-bit hashes. Visual similarity is `1 - distance / 64`. Missing, malformed, or unprocessable hashes produce no visual component rather than crashing matching. A hash represents visual resemblance only; it can be misleading for simple or near-identical-looking objects.

## Combined score and thresholds

With an image score:

`combined = 0.55 × text + 0.20 × category + 0.15 × location + 0.10 × visual`

Without an image, the available text/category/location weights are renormalized to sum to 1.00, so text-only reports are comparable. The standard candidate threshold is 0.62. If visual similarity is at least 0.90, the threshold is lowered carefully to 0.54 because strong visual evidence is useful, but it never makes a match automatic: weak text and context still fail.

Weights and thresholds live in `backend/services/matching.service.js` as `CONFIG`. The intentionally conservative visual weight prevents an identical generic image from by itself becoming a candidate.

## Limits

The engine is language-oriented toward English and relies on descriptive report text and images. It does not identify a person, verify ownership, detect image manipulation, or guarantee an item match. Human verification and the future secure chat workflow remain necessary.
