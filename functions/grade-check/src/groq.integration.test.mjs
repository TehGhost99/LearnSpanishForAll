/**
 * Live Groq smoke test. Skips unless GROQ_API_KEY is set.
 * Run: GROQ_API_KEY=gsk_... node functions/grade-check/src/groq.integration.test.mjs
 */
const KEY = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "");
const MODEL = (process.env.GROQ_MODEL || "openai/gpt-oss-20b").trim();

if (!KEY) {
  console.log("skip: GROQ_API_KEY not set");
  process.exit(0);
}

async function chat(messages, { json = true } = {}) {
  const body = {
    model: MODEL,
    temperature: 0.2,
    max_completion_tokens: 400,
    reasoning_effort: "low",
    include_reasoning: false,
    messages,
  };
  if (json) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "tutor_reply",
        strict: true,
        schema: {
          type: "object",
          properties: { reply: { type: "string" } },
          required: ["reply"],
          additionalProperties: false,
        },
      },
    };
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data };
}

const { res, data } = await chat([
  {
    role: "system",
    content: "You are a Spanish tutor. Reply with JSON {\"reply\": \"...\"} only.",
  },
  { role: "user", content: "Does como te llamas mean what is your name?" },
]);

if (!res.ok) {
  console.error("Groq failed", res.status, JSON.stringify(data));
  process.exit(1);
}

const text = (((data.choices || [])[0] || {}).message || {}).content || "";
let parsed;
try {
  parsed = JSON.parse(text);
} catch (e) {
  console.error("Not JSON:", text);
  process.exit(1);
}
if (!parsed.reply || !/yes|sí|name|nombre/i.test(parsed.reply)) {
  console.error("Unexpected reply:", parsed);
  process.exit(1);
}
console.log("groq integration ok:", MODEL, parsed.reply.slice(0, 120));
