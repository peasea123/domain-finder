# Implementation Brief: Virtual-Letter + Weighted Pronounceable Domain Generator (3–12 chars)

## Purpose

Upgrade the existing domain-name generator to produce **pronounceable, English-like domain labels** of **exact target length** selected by the user, where target length can be **any integer from 3 to 12 characters** (inclusive). The current UI/CLI/API already allows users to choose length up to 12; that behavior must remain unchanged except that the **minimum allowed length is 3**.

This upgrade introduces:
1) **Virtual letters** (multi-character phonetic units) that occupy one pattern slot (C or V)  
2) **Weighted selection** (prioritize “good-looking / English-like” units and deprioritize awkward/rare ones)  
3) Constraints + optional scoring/ranking

The goal is to integrate into the existing codebase with minimal churn and preserve existing behavior/modes.

---

## Non-Negotiable Requirements

### R1. Length selection is 3–12 chars
- The generator must accept `targetLen` chosen by the user, **3 ≤ targetLen ≤ 12**
- Output strings must be **exactly** `targetLen` characters
- The existing length-selection UI/API must remain available and backward compatible (except enforcing min=3)

### R2. Weighted unit selection MUST be included
The system must incorporate **weights** to prioritize better phonetic/visual chunks:
- Weights apply to both single letters and multi-letter units
- Weights may be adjusted by position (initial/final preferences) and feasibility (exact-length)
- Weights must be controlled via config (JSON) so they can be tuned without code changes

---

## Current State (AI must discover)

The codebase currently generates candidates via:
- random selection, and/or
- systematic enumeration (e.g., starting from A and substituting)

The AI should locate:
- where patterns are defined (e.g., `CVCV`)
- where letters are chosen for each slot
- where length is enforced
- how candidates are returned and filtered
- where availability checks occur (DNS/HTTP)
- how UI/API exposes options (length, count, mode, etc.)

---

## Key Concept: Virtual Letters (multi-character units)

A pattern slot `C` or `V` selects a **unit string** of length 1 or 2 chars.

Examples:
- Consonant units: `"th"`, `"st"`, `"tr"`, `"pl"`, `"ng"`, `"ck"`, `"qu"`
- Vowel units: `"ea"`, `"ai"`, `"oo"`, r-controlled vowels `"ar"`, `"er"`, `"or"` treated as `V`

A candidate’s final length is the sum of unit string lengths.

### Exact-length requirement
The generator must ensure the final string length equals `targetLen` exactly (3–12).
This requires feasibility checks and backtracking when using 1–2 char units.

---

## Patterns

The system should support a weighted set of patterns (configurable) such as:
- `CVC`, `VCV` (needed for length 3)
- `CVCV`, `CVCVC`, `VCVC`, `VCVCV`, `CVCCV`, `CCVCV`, etc.

The AI may keep the existing pattern system and simply expand the alphabet for each slot from letters → units.

---

## Unit Sets (Must be Config-Driven)

### Consonant Units (C)
Tier 1 digraphs (single phoneme):
- `th ch sh ph wh ck ng`

Tier 2 blends (stable onsets):
- `bl br cl cr dr fl fr gl gr pl pr sl sm sn sp st tr tw`

Singles:
- `b c d f g h j k l m n p r s t v w y z`
Special:
- `qu` (treated as C unit, but must be followed by V slot)

### Vowel Units (V)
Core digraphs:
- `ai ea ee oa oo ie ou`

Secondary digraphs:
- `au aw ei ey oy ue ui`

R-controlled (treated as V):
- `ar er ir or ur`

Singles:
- `a e i o u`

---

## Weighted Selection (Contract Detail)

### Baseline concept
Each unit has a **base weight** `w` (from config). Selection is via weighted random or weighted choice.

### Required weighting behavior
Weights must allow (and default toward) English-like results:
- Higher weights for common/pleasant chunks (e.g., `th`, `st`, `tr`, `pl`, `ea`, `ai`, `ar`, `er`)
- Lower weights for rare letters (e.g., `j`, `x`, `q`, `z`) unless stylized mode is requested
- Position-based adjustments:
  - blends/digraphs prefer initial position (bonus multiplier)
  - `ng` prefers final position (penalty if non-final)
  - `ck` only after vowel (hard constraint)
  - `qu` must be followed by vowel slot (hard constraint)

### Feasibility gating (required)
If choosing a unit would make it impossible to reach exact remaining length (given remaining slots), its effective weight becomes **0**.

Simple feasibility bounds are acceptable:
- remainingSlots = patternSlotsRemaining
- remainingLen = targetLen - (currentChars + chosenUnitChars)
- minPossible = remainingSlots * 1
- maxPossible = remainingSlots * 2
- If remainingLen not in [minPossible, maxPossible] → reject choice (weight 0)

### Config must include these weights
The config must explicitly represent weights for:
- each unit (including multi-units)
- each pattern (optional but recommended)
- rare letters / penalties
- optional awkward bigrams list

---

## Constraints

### Hard constraints (must enforce)
- Disallow substrings: `jq qx zx vw kj ii uu aa yy` (configurable)
- `ck` must be post-vowel unit
- `qu` must be followed by a V slot
- Output must be exactly `targetLen` chars (3–12)

### Soft constraints (penalize or reduce weight)
- `ng` not final gets weight penalty multiplier
- blends/digraphs not initial lose bonus
- avoid exact repeated units (e.g., `ee` then `ee`) via heavy penalty multiplier

---

## Scoring + Ranking (Recommended, not required for MVP)

After generation, optionally score candidates and rank:
- bonus for containing 1+ multi-letter unit (often more natural)
- penalty for rare letters (`j x q z`)
- penalty for awkward bigrams (`bp dg dt fp gb`)
- vowel ratio heuristic (aim ~0.3–0.6)

Return richer metadata when possible:
- name
- score
- pattern used
- units used
- reasons/explanations

But keep a backward-compatible pathway returning plain strings if the rest of the app expects it.

---

## Integration Requirements (Minimal Churn)

- Preserve current generation mode(s) and default behavior.
- Add new options without breaking old ones:
  - e.g., `mode=virtual` (virtual letters enabled)
  - `weighted=true` (use weights; default true for virtual mode)
  - optional `scored=true` to rank results
- Reuse existing availability checking pipeline exactly as-is.
- Ensure new generator plugs into the same output/response format (or provide adapter).

---

## Acceptance Tests

### Length
- For each targetLen in [3..12], generated candidates must be exactly that length.

### Virtual unit usage
- In virtual mode, results should include some candidates with digraphs/blends (e.g., `th`, `st`, `ea`, `ar`) for mid-range lengths (4–12), unless targetLen makes it impossible.

### Constraints
- No disallowed substrings appear
- `ck` never appears without vowel unit immediately before it
- `qu` always followed by V slot

### Weights
- With fixed seed (if supported), top results should statistically favor higher-weight units over many runs.
- Rare letters appear less frequently unless the user explicitly selects a “stylized” mode (future extension).

---

## Deliverables

1) JSON config file containing units, patterns, weights, constraints, scoring params  
2) Updated generator supporting:
   - exact length 3–12
   - virtual letters
   - weighted selection
   - feasibility gating/backtracking
3) Minimal demo/test harness (script or unit tests)
4) Integration into existing API/UI as an optional mode with backward compatibility

End.
