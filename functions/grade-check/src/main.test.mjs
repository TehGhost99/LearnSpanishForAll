import { publicError, normalizeKey, parseJsonLoose, extractContent } from "./main.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(
  publicError("Invalid API Key") === "AI is temporarily unavailable (invalid Groq API key).",
  "maps invalid key"
);
assert(
  publicError("The model llama-3.1-8b-instant does not exist or you do not have access to it.") ===
    "AI is temporarily unavailable (the model was retired).",
  "maps retired model"
);
assert(normalizeKey(' Bearer gsk_abc ') === "gsk_abc", "strips bearer and quotes/space");
assert(parseJsonLoose('```json\n{"reply":"hola"}\n```').reply === "hola", "parses fenced json");
assert(
  extractContent({ choices: [{ message: { content: "", reasoning: '{"a":1}' } }] }) === '{"a":1}',
  "falls back to reasoning"
);

console.log("grade-check helpers ok");
