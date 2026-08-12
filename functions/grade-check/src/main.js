/**
 * Appwrite Function: grade-check
 * Two modes via body.mode:
 *   - "grade" (default): grade free-text practice checks
 *   - "tutor": Spanish study helper chat (translations, grammar, alternatives)
 *              that must NOT reveal answers to active practice / test questions
 *
 * Env: GROQ_API_KEY
 * Model: Llama 3.1 8B Instant via Groq
 */
const MODEL = "llama-3.1-8b-instant";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Appwrite-Project, X-Appwrite-Key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function callGroq(apiKey, messages, { temperature = 0.2, max_tokens = 400, json = true } = {}) {
  const body = {
    model: MODEL,
    temperature,
    max_tokens,
    messages,
  };
  if (json) body.response_format = { type: "json_object" };

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify(body),
  });
  const groqData = await groqRes.json();
  return { groqRes, groqData };
}

function parseJsonLoose(text) {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

async function handleGrade(body, apiKey, { log, error, res }) {
  const question = (body.question || "").trim();
  const rubric = (body.rubric || "").trim();
  const exemplar = (body.exemplar || "").trim();
  const userAnswer = (body.userAnswer || "").trim();
  const focus = (body.focus || "").trim();
  const taskWork = (body.taskWork || "").trim();

  if (!question || !rubric || !userAnswer) {
    return res.json({ error: "question, rubric, and userAnswer are required." }, 400);
  }

  const prompt = `You are grading a short written answer from a student learning Latin American Spanish as an absolute beginner. Accept minor spelling issues if meaning is clear. Prefer tú/usted forms used in Latin America; do not require vosotros.

Focus of today's practice: ${focus || "(not specified)"}
Question: ${question}

Grading rubric (what a good answer must show):
${rubric}

Exemplar of a strong answer (for your calibration only — do NOT quote it back verbatim as if the student wrote it):
${exemplar || "(none provided)"}

${taskWork ? `Student's earlier practice attempt (context only):\n${taskWork.slice(0, 1500)}\n` : ""}
Student's written answer to grade:
${userAnswer.slice(0, 2500)}

Grade the answer as exactly one of:
- correct — captures the core idea(s) in the rubric; wording can differ
- mostly_correct — partially right or missing an important piece, but shows real understanding
- incorrect — misses the point, contradicts the rubric, or is too vague/empty to judge

Respond with ONLY valid JSON (no markdown fences):
{"grade":"correct"|"mostly_correct"|"incorrect","feedback":"2-4 sentences. Be encouraging and specific. Say what worked and what to improve. Do not reveal a full model answer word-for-word."}`;

  try {
    const { groqRes, groqData } = await callGroq(apiKey, [
      {
        role: "system",
        content: "You grade short Spanish-learning answers. Reply with JSON only.",
      },
      { role: "user", content: prompt },
    ]);

    if (!groqRes.ok) {
      error("Groq error: " + JSON.stringify(groqData));
      const msg = (groqData.error && groqData.error.message) || "Grading service failed.";
      return res.json({ error: msg }, 502);
    }

    const text = (
      (((groqData.choices || [])[0] || {}).message || {}).content || ""
    ).trim();

    let parsed;
    try {
      parsed = parseJsonLoose(text);
    } catch (e) {
      log("Raw model text: " + text);
      return res.json({
        grade: "mostly_correct",
        feedback: text.slice(0, 600) || "Could not parse a structured grade. Please retry.",
      });
    }

    const allowed = { correct: 1, mostly_correct: 1, incorrect: 1 };
    const grade = allowed[parsed.grade] ? parsed.grade : "mostly_correct";
    const feedback = String(parsed.feedback || "No feedback returned.").slice(0, 1200);

    return res.json({ grade, feedback });
  } catch (e) {
    error(String(e && e.message ? e.message : e));
    return res.json({ error: "Unexpected grading error." }, 500);
  }
}

async function handleTutor(body, apiKey, { log, error, res }) {
  const message = (body.message || "").trim();
  if (!message) {
    return res.json({ error: "message is required." }, 400);
  }

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const activeQuestion = (body.activeQuestion || "").trim().slice(0, 500);
  const phase = (body.phase || "").trim().slice(0, 40);
  const mode = (body.sessionMode || "").trim().slice(0, 40);

  const system = `You are a friendly Latin American Spanish tutor for absolute beginners on LearnSpanishForAll.

You MAY help with:
- Translations (EN↔ES) of words/phrases the learner provides
- Why a translation is phrased a certain way
- Natural alternatives and when to use them
- Grammar, pronunciation tips (tú/usted; no vosotros as the default)
- Clarifying lesson vocabulary and usage

You MUST NOT:
- Give away answers to practice checks, quizzes, or timed practice tests
- Complete the learner's homework/check for them when they paste a practice question
- Quote exemplars, rubrics, or "the correct answer is…" for an active practice item
- Role-play as a grader that fills in the blank for them

If the learner asks for the answer to a practice/test question (including the active one below), refuse politely and coach: suggest strategies, related vocabulary, grammar patterns, or ask them to try first. You may translate unrelated phrases they invent themselves.

Active practice context (do not answer this for them):
phase=${phase || "none"} sessionMode=${mode || "none"}
activeQuestion=${activeQuestion || "(none)"}

Reply with ONLY valid JSON:
{"reply":"your helpful message in clear bilingual EN/ES when useful, max ~180 words"}`;

  const messages = [{ role: "system", content: system }];
  history.forEach((h) => {
    if (!h || !h.role || !h.content) return;
    const role = h.role === "assistant" ? "assistant" : "user";
    messages.push({ role, content: String(h.content).slice(0, 1200) });
  });
  messages.push({ role: "user", content: message.slice(0, 2000) });

  try {
    const { groqRes, groqData } = await callGroq(
      apiKey,
      messages,
      { temperature: 0.4, max_tokens: 500, json: true }
    );

    if (!groqRes.ok) {
      error("Groq tutor error: " + JSON.stringify(groqData));
      const msg = (groqData.error && groqData.error.message) || "Tutor service failed.";
      return res.json({ error: msg }, 502);
    }

    const text = (
      (((groqData.choices || [])[0] || {}).message || {}).content || ""
    ).trim();

    let parsed;
    try {
      parsed = parseJsonLoose(text);
    } catch (e) {
      log("Raw tutor text: " + text);
      return res.json({ reply: text.slice(0, 1200) || "Sorry — I could not format a reply. Try again." });
    }

    const reply = String(parsed.reply || parsed.message || text || "No reply.").slice(0, 2000);
    return res.json({ reply });
  } catch (e) {
    error(String(e && e.message ? e.message : e));
    return res.json({ error: "Unexpected tutor error." }, 500);
  }
}

export default async ({ req, res, log, error }) => {
  if (req.method === "OPTIONS") {
    return res.send("", 204, corsHeaders());
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    error("GROQ_API_KEY is not set");
    return res.json({ error: "AI is not configured (missing API key)." }, 500);
  }

  let body;
  try {
    body =
      typeof req.bodyJson === "object" && req.bodyJson
        ? req.bodyJson
        : JSON.parse(req.body || "{}");
  } catch (e) {
    return res.json({ error: "Invalid JSON body." }, 400);
  }

  const mode = String(body.mode || "grade").toLowerCase();
  if (mode === "tutor") {
    return handleTutor(body, apiKey, { log, error, res });
  }
  return handleGrade(body, apiKey, { log, error, res });
};
