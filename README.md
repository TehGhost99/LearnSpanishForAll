# LearnSpanishForAll

Friendly, bilingual (English + Spanish) site for **absolute beginners** learning
**Latin American Spanish**. Daily **15–20 minute** Practice sessions (~150 days):
concept cue → Spanish task → written checks.

Built with the same static pipeline as yt2site (Markdown → Jinja → `output/`), but
this is a **separate** GitHub repo/site. The Effective Learner (`yt2site`) stays unchanged.

## Live URL (after Pages is enabled)

https://tehghost99.github.io/LearnSpanishForAll/

## Appwrite

Project: **Learnig Spanish**  
Endpoint: `https://sfo.cloud.appwrite.io/v1`  
Project ID: `6a78a8d900090c79eec5`

Browser config: `assets/appwrite-config.js`  
Shared client + **automatic `client.ping()` on Practice load**: `assets/appwrite-client.js`

> Note: This site is static (no npm app). Appwrite is loaded from the CDN (like
> the Practice app pattern), not `npm install appwrite`. That keeps `file://` and
> GitHub Pages builds simple.

### Still needed for full cloud features

1. Appwrite Database `practice` + table/collection `progress` (one row per user)
2. Web platforms: `tehghost99.github.io`, `localhost`, `127.0.0.1`
3. Deploy `functions/grade-check` with `GROQ_API_KEY` (model: `openai/gpt-oss-20b`)
4. Temporary `APPWRITE_API_KEY` so scripts can register platforms / deploy the function

Local Practice works without those (browser-only saves).

## Build

```bash
python3 -m pip install -r requirements.txt
python3 scripts/build_curriculum.py
python3 scripts/build_site.py
python3 scripts/serve_site.py
```

## Practice features

- 15 subjects × 10 days = **150** sessions
- First ~120 days aim at a ~500-word foundation, then deeper topics
- Focus picker **v1** (topic emphasis). Free-text AI program builder is **v2** (later)
- Auth + sync when Appwrite is fully configured

## Methods (see Sources page)

ACTFL can-do framing, comprehensible input, spaced retrieval / testing-effect
research, and NSA Level 01 vocabulary themes for beginner topic coverage.
