const controls = document.querySelector(".controls");
const search = document.querySelector("#search");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");
const buttons = [...controls.querySelectorAll("[data-filter]")];

function normalize(text) {
  return text.toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/ـ/g, "")
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/\s+/g, " ")
    .trim();
}

const cards = [...document.querySelectorAll(".card")].map(card => ({
  node: card,
  category: card.dataset.category,
  text: normalize(card.textContent),
}));

function update() {
  const selected = buttons.find(button => button.getAttribute("aria-pressed") === "true").dataset.filter;
  const query = normalize(search.value);
  let visible = 0;

  for (const card of cards) {
    const matches = (selected === "all" || card.category === selected) && card.text.includes(query);
    card.node.hidden = !matches;
    if (matches) visible += 1;
  }

  count.value = `${visible} من ${cards.length} شاهدًا`;
  empty.hidden = visible > 0;
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    for (const filter of buttons) {
      filter.setAttribute("aria-pressed", String(filter === button));
    }
    update();
  });
}

search.addEventListener("input", update);
controls.hidden = false;
