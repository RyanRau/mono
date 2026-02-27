# Kokoro TTS — Inflection & Delivery Guide

Kokoro is plain-text only (no SSML). All prosody control comes from punctuation, sentence structure, voice choice, and speed.

**Resources:**
- [hexgrad/kokoro](https://github.com/hexgrad/kokoro) — Python library source
- [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) — model card & voice samples on Hugging Face
- [hexgrad/Kokoro-TTS](https://huggingface.co/spaces/hexgrad/Kokoro-TTS) — live demo (no install needed)
- [misaki](https://github.com/hexgrad/misaki) — the G2P engine Kokoro uses for phonemization (explains how punctuation is interpreted)

---

## Voice Families

The voice prefix determines accent and gender. Within each family, voices have distinct personalities — warm, crisp, breathy, authoritative, playful, etc.

| Prefix | Accent  | Gender |
|--------|---------|--------|
| `af_`  | American | Female |
| `am_`  | American | Male   |
| `bf_`  | British  | Female |
| `bm_`  | British  | Male   |

> **Biggest lever:** voice selection has more impact on delivery style than any text trick.

---

## 1. Statements vs. Questions vs. Exclamations

Punctuation at the end of a sentence drives the intonation contour.

```
The meeting starts at nine.
```
*Flat, declarative. No rise.*

```
The meeting starts at nine?
```
*Rising intonation. Signals confusion or confirmation-seeking.*

```
The meeting starts at nine!
```
*Emphatic, punchy. Higher energy on the last word.*

---

## 2. Pauses

Different pause markers produce different lengths and textures.

```
We need to talk, and I mean really talk, about what happened.
```
*Commas → short breath pauses. Keeps momentum.*

```
We need to talk. And I mean really talk. About what happened.
```
*Periods → full stops. Each phrase lands separately. More deliberate.*

```
We need to talk... about what happened.
```
*Ellipsis → trailing, suspenseful pause. Hesitation before revealing.*

```
We need to talk — now.
```
*Em dash → abrupt cut before a punch. Sharper than a comma.*

---

## 3. Emphasis via Capitalization

Words in ALL CAPS get stressed by the phonemizer.

```
I told you NOT to open that door.
```

```
This is the LAST time I'm asking.
```

Use sparingly — one or two per sentence maximum. Too many caps flattens the effect.

---

## 4. Pacing via Sentence Length

Short sentences feel fast and urgent. Long sentences feel slower and more measured.

**Urgent:**
```
Run. Don't look back. Just run.
```

**Measured / authoritative:**
```
The decision we make tonight will shape the course of this organization for the next decade, and I want each of you to understand the weight of that responsibility.
```

**Choppy on purpose (listing):**
```
First: silence. Second: darkness. Third: a sound you can't place.
```

---

## 5. Trailing Off vs. Hard Stop

```
I thought I heard something... but it was probably nothing.
```
*Voice trails before the comma, then resets.*

```
I thought I heard something. It was nothing.
```
*Two full stops. Clipped. Confident.*

---

## 6. Dialogue / Character Contrast

Mix voices by making separate requests per line of dialogue. Voices with contrasting personalities work best.

| Line | Suggested voice |
|------|----------------|
| Narrator | `am_michael` or `bf_emma` |
| Villain  | `bm_lewis` or `am_onyx` |
| Warm character | `af_heart` or `bf_alice` |
| Quirky / playful | `am_puck` or `af_sky` |
| Formal / authoritative | `bm_daniel` or `am_eric` |

---

## 7. Speed + Punctuation Combos

Speed (0.5–2.0×) stacks with punctuation to tune the feel.

| Effect | Speed | Text style |
|--------|-------|------------|
| Relaxed audiobook | 0.85–0.95 | Long sentences, commas |
| Natural conversation | 1.0 | Mixed |
| Energetic narration | 1.1–1.2 | Short sentences, exclamation |
| Auctioneer / rapid | 1.4–1.6 | No punctuation pauses |
| Slow dramatic | 0.75–0.85 | Ellipses, em dashes |

---

## Sample Texts to Try

### Calm narration
> Voice: `af_sarah` · Speed: 0.9

```
The forest was quiet that morning. Not peaceful — quiet in the way that makes you hold your breath, as if the trees themselves were listening.
```

### Urgent scene
> Voice: `am_liam` · Speed: 1.15

```
We have maybe four minutes. Get the files. Don't stop for anything. Meet me at the car.
```

### Suspense build
> Voice: `bm_george` · Speed: 0.85

```
There was a noise. Faint... but unmistakable. Someone was in the house.
```

### Warm announcement
> Voice: `af_heart` · Speed: 1.0

```
We're so glad you're here! Tonight is going to be a night to remember, and we couldn't have done it without each and every one of you.
```

### Cold authority
> Voice: `bm_daniel` · Speed: 0.95

```
This is not a request. You will be at the briefing by 0800. Failure to comply will have consequences.
```

### Playful / upbeat
> Voice: `am_puck` · Speed: 1.1

```
Oh, come on! It'll be fun! When was the last time you did something completely ridiculous? Exactly. Let's go!
```

### Hesitant / nervous
> Voice: `af_nova` · Speed: 0.9

```
I'm not sure I should be telling you this... but you're going to find out eventually. Just... promise me you won't be angry.
```

---

## 8. Phonetic Spelling & Stress Overrides

Misaki (the G2P engine under Kokoro) accepts a markdown link syntax to override how a word is pronounced. This bypasses automatic phonemization entirely for that word.

### Pronunciation override

```
[word](/ipa/)
```

The "URL" is an IPA string wrapped in forward slashes. The display text is what you want spoken; the IPA is how to say it.

**Common use cases:**

| Problem | Text | Override |
|---------|------|---------|
| Proper noun mispronounced | `Kokoro` | `[Kokoro](/kˈOkəɹO/)` |
| Technical acronym read as a word | `SQL` | `[SQL](/ˌɛskjuˈɛl/)` |
| Foreign word mangled | `Nguyen` | `[Nguyen](/wɪn/)` |
| Homograph (different meaning = different sound) | `read` (past tense) | `[read](/ɹɛd/)` |
| Disputed pronunciation | `GIF` | `[GIF](/dʒɪf/)` or `[GIF](/ɡɪf/)` |
| Name with silent letters | `Hermione` | `[Hermione](/hɜːɹˈmaɪəni/)` |

**Full sentence example:**

```
[Nietzsche](/nˈiʧə/) believed that suffering was the price of greatness.
```

```
The [epoch](/ˈɛpək/) of machine learning began in earnest around [2012](/twɛntitwɛlv/).
```

### IPA phoneme reference

Misaki uses a slightly customized IPA set. See [EN_PHONES.md](https://github.com/hexgrad/misaki/blob/main/EN_PHONES.md) for the full table. Quick reference for American English:

| Sound | Symbol | Example word |
|-------|--------|-------------|
| Primary stress | `ˈ` | placed before stressed syllable |
| Secondary stress | `ˌ` | placed before secondary syllable |
| Schwa | `ə` | **a**bout |
| Short i | `ɪ` | k**i**t |
| Long ee | `i` | fl**ee**ce |
| Short oo | `ʊ` | f**oo**t |
| Long oo | `u` | g**oo**se |
| Ash | `æ` | tr**a**p |
| "oh" (American) | `O` | g**o** |
| "ah" | `ɑ` | l**o**t |
| "aw" | `ɔ` | th**ou**ght |
| "ay" | `A` | f**a**ce |
| "eye" | `I` | pr**i**ce |
| "ow" | `W` | m**ou**th |
| "oy" | `Y` | ch**oi**ce |
| r-sound | `ɹ` | **r**un |
| sh | `ʃ` | **sh**ip |
| zh | `ʒ` | vi**s**ion |
| th (soft) | `ð` | **th**is |
| th (hard) | `θ` | **th**in |
| j / dg | `ʤ` | **j**udge |
| ch | `ʧ` | **ch**urch |

### Stress level adjustment

The syntax is parsed by misaki, but **results are unreliable in practice**. The `apply_stress` function silently no-ops when the word's existing stress state doesn't match what the modifier expects — e.g. `+2` only adds stress if the word has *no* existing stress markers; `-1` demotes primary → secondary but only if primary stress is present. Most words will fall through unchanged.

```
[word](-1)   demote primary stress → secondary  (word must already have primary stress)
[word](-2)   remove all stress markers           (most reliable of the four)
[word](+2)   add primary stress                  (only works if word has no stress at all)
```

If you need reliable pronunciation control, use a full IPA override instead — it bypasses G2P entirely and is guaranteed to take effect.

---

## Tips

- Keep sentences under ~25 words for the cleanest prosody.
- Break long paragraphs into 2-sentence chunks — Kokoro can run breathless on dense text.
- Commas inside a sentence are more natural-sounding than multiple short sentences for conversational content.
- For numbers and abbreviations, spell them out: *"three hundred"* not *"300"*, *"et cetera"* not *"etc."*
- British voices (`bf_`, `bm_`) naturally handle UK spellings and placenames better.
