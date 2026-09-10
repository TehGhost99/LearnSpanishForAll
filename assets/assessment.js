/* Interactive self-assessment for LearnSpanishForAll Getting Started.
   Bilingual beginner placement — recommends first lessons + Practice. */
(function () {
  "use strict";

  var root = document.getElementById("self-assessment-app");
  if (!root) return;

  var SCALE = [
    { value: 2, label: "Yes / Sí" },
    { value: 1, label: "A little / Un poco" },
    { value: 0, label: "Not sure / No sé" },
    { value: -1, label: "Mostly no / Casi no" },
    { value: -2, label: "No / No" }
  ];

  var QUESTIONS = [
    { id: 1, group: "A", text: "I can greet someone in Spanish (hola, buenos días) without looking it up. / Puedo saludar en español sin buscar." },
    { id: 2, group: "A", text: "I can say my name and ask someone theirs in Spanish. / Puedo decir mi nombre y preguntar el de otra persona." },
    { id: 3, group: "B", text: "I know numbers 1–20 in Spanish. / Sé los números del 1 al 20 en español." },
    { id: 4, group: "B", text: "I can name family members (madre, hermano…) in Spanish. / Puedo nombrar miembros de la familia." },
    { id: 5, group: "C", text: "I can order simple food/drink words in Spanish. / Puedo pedir comida/bebida simple en español." },
    { id: 6, group: "C", text: "I can say what I like with me gusta. / Puedo decir qué me gusta." },
    { id: 7, group: "D", text: "I already practice Spanish out loud most days. / Ya practico español en voz alta casi todos los días." },
    { id: 8, group: "D", text: "I can protect 15–20 minutes a day for Spanish. / Puedo proteger 15–20 minutos al día." }
  ];

  var GROUPS = {
    A: {
      title: "First conversations / Primeras conversaciones",
      blurb: "Start with greetings and identity so you can open a real exchange. / Empieza con saludos e identidad.",
      workOn: [
        { label: "Greetings & Sounds", href: "greetings-sounds.html" },
        { label: "Who I Am", href: "identity.html" }
      ],
      practice: "greetings-sounds"
    },
    B: {
      title: "Building blocks / Bloques básicos",
      blurb: "Numbers, time, and people words unlock everyday talk. / Números, tiempo y personas abren la charla diaria.",
      workOn: [
        { label: "Numbers, Time & Calendar", href: "numbers-time.html" },
        { label: "Family & People", href: "family-people.html" }
      ],
      practice: "numbers-time"
    },
    C: {
      title: "Useful topics / Temas útiles",
      blurb: "Food and likes make practice feel real quickly. / Comida y gustos hacen la práctica real.",
      workOn: [
        { label: "Food & Drink", href: "food-drink.html" },
        { label: "Likes & Hobbies", href: "likes-hobbies.html" }
      ],
      practice: "food-drink"
    },
    D: {
      title: "Habit / Hábito",
      blurb: "Consistency beats intensity. Open Practice daily. / La constancia gana. Abre Practice cada día.",
      workOn: [
        { label: "Practice app", href: "practice.html" }
      ],
      practice: null
    }
  };

  var answers = {};

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    (kids || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function render() {
    root.innerHTML = "";
    root.appendChild(el("div", { class: "sa-card" }, [
      el("p", { class: "sa-lead", text: "Answer honestly — this is placement, not a grade. / Responde con honestidad: es ubicación, no nota." })
    ]));

    QUESTIONS.forEach(function (q) {
      var row = el("div", { class: "sa-q" }, [
        el("p", { text: q.id + ". " + q.text }),
        el("div", { class: "sa-scale" }, SCALE.map(function (s) {
          var selected = answers[q.id] === s.value;
          return el("button", {
            class: "sa-opt" + (selected ? " active" : ""),
            type: "button",
            text: s.label,
            onclick: function () {
              answers[q.id] = s.value;
              render();
            }
          });
        }))
      ]);
      root.appendChild(row);
    });

    var ready = QUESTIONS.every(function (q) { return answers[q.id] !== undefined; });
    root.appendChild(el("button", {
      class: "sa-submit" + (ready ? "" : " disabled"),
      type: "button",
      text: ready ? "See my starting path / Ver mi camino" : "Answer all items / Responde todo",
      onclick: function () { if (ready) showResults(); }
    }));
  }

  function showResults() {
    var scores = { A: 0, B: 0, C: 0, D: 0 };
    QUESTIONS.forEach(function (q) { scores[q.group] += answers[q.id]; });
    // Lower score = weaker = prioritize
    var order = Object.keys(scores).sort(function (a, b) { return scores[a] - scores[b]; });

    root.innerHTML = "";
    root.appendChild(el("div", { class: "sa-card sa-results" }, [
      el("h3", { text: "Your starting focus / Tu enfoque inicial" }),
      el("p", { text: "Begin with Learning Materials in order, and give extra love to your weaker areas below. Then open Practice for Day 1. / Empieza los materiales en orden y refuerza las áreas más débiles. Luego abre Practice para el día 1." })
    ]));

    order.forEach(function (g, i) {
      var info = GROUPS[g];
      var links = info.workOn.map(function (w) {
        return el("li", {}, [el("a", { href: w.href, text: w.label })]);
      });
      root.appendChild(el("div", { class: "sa-card" }, [
        el("div", { class: "sa-kicker", text: i === 0 ? "Priority / Prioridad" : "Also useful / También útil" }),
        el("h3", { text: info.title }),
        el("p", { text: info.blurb }),
        el("ul", {}, links)
      ]));
    });

    root.appendChild(el("p", {}, [
      el("a", { class: "sa-cta", href: "practice.html", text: "Start Practice Day 1 → / Empezar práctica día 1 →" })
    ]));
  }

  render();
})();
