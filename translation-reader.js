const reader = document.querySelector("#translation-reader");
const search = reader.querySelector("#translation-search");
const rows = reader.querySelector("#translation-rows");
const status = reader.querySelector("#translation-status");
const previous = reader.querySelector("#translation-prev");
const next = reader.querySelector("#translation-next");
const retry = reader.querySelector("#translation-retry");
const columns = [
  { key: "english", label: "الأصل الإنجليزي", className: "quote-en", lang: "en", direction: "ltr" },
  { key: "machine", label: "تعريب آلي", className: "quote-h", lang: "ar", direction: "rtl" },
  { key: "other", label: "التعريب الآخر", className: "quote-a", lang: "ar", direction: "rtl" },
];
const pageSize = 30;
let entries = [];
let results = [];
let page = 0;

function normalize(text) {
  return text.toLowerCase().normalize("NFKD").replace(/\p{Mark}|ـ/gu, "")
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/\s+/g, " ").trim();
}

function readable(text, lang) {
  return text.replace(/\\n\[8\]/gi, lang === "en" ? "[Player name]" : "[اسم اللاعب]")
    .replace(/<br\s*\/?>|\\n(?![a-z\[<])/gi, "\n")
    .replace(/\\(?:[a-z]+(?:\[[^\]\r\n]*\]|<[^>\r\n]*>)?|[!.|^{}<>$])/gi, "")
    .replace(/\\(["'#])/g, "$1")
    .trim() || text;
}

async function loadColumn(column) {
  const response = await fetch(reader.dataset[column.key]);
  if (!response.ok) throw new Error("Download failed");
  const text = await response.text();
  const headers = [...text.matchAll(/^(\d+)\) (\[[^\r\n]+\])\r?$/gm)];
  if (headers.length !== Number(reader.dataset.count)) throw new Error("Unexpected entry count");
  return headers.map((header, index) => {
    const start = header.index + header[0].length;
    const end = headers[index + 1]?.index ?? text.length;
    const body = readable(text.slice(start, end).trim(), column.lang);
    return { id: header[1], key: header[2], body };
  });
}

function renderRow({ id, texts }) {
  const row = document.createElement("li");
  row.className = "card translation-row";
  row.id = "entry-" + id;

  const number = document.createElement("bdi");
  number.className = "entry translation-entry";
  number.textContent = "#" + id;
  const grid = document.createElement("div");
  grid.className = "quotes";

  columns.forEach((column, index) => {
    const quote = document.createElement("div");
    quote.className = "quote " + column.className;
    const label = document.createElement("h2");
    label.className = "translation-label";
    label.textContent = column.label;
    const lines = document.createElement("div");
    lines.className = "lines";
    lines.lang = column.lang;
    lines.dir = column.direction;
    const text = document.createElement("p");
    text.textContent = texts[index];
    lines.append(text);
    quote.append(label, lines);
    grid.append(quote);
  });

  row.append(number, grid);
  return row;
}

function render() {
  const start = page * pageSize;
  const batch = results.slice(start, start + pageSize);
  rows.replaceChildren(...batch.map(renderRow));
  status.textContent = batch.length
    ? `${start + 1}–${start + batch.length} من ${results.length.toLocaleString("en-US")}`
    : "لا توجد نتائج لهذا البحث.";
  previous.disabled = page === 0;
  next.disabled = start + pageSize >= results.length;
}

function filter() {
  const query = normalize(search.value);
  const id = /^#?(\d+)$/.exec(query);
  results = !query ? entries : entries.filter(entry =>
    id ? entry.id === id[1] : entry.searchable.some(text => text.includes(query))
  );
  page = 0;
  render();
}

async function load() {
  retry.hidden = true;
  status.textContent = "جارٍ تحميل النصوص…";
  reader.setAttribute("aria-busy", "true");
  try {
    const versions = await Promise.all(columns.map(loadColumn));
    entries = versions[0].map((source, index) => {
      const related = versions.map(version => version[index]);
      if (related.some(row => row.id !== source.id || row.key !== source.key)) {
        throw new Error("Entry alignment failed");
      }
      const texts = related.map(row => row.body);
      return { id: source.id, texts, searchable: texts.map(normalize) };
    });
    search.disabled = false;
    filter();
  } catch {
    status.textContent = "تعذّر تحميل المقارنة.";
    retry.hidden = false;
  } finally {
    reader.setAttribute("aria-busy", "false");
  }
}

function goTo(offset) {
  page += offset;
  render();
  rows.focus({ preventScroll: true });
  rows.scrollIntoView({ block: "start" });
}

search.addEventListener("input", filter);
previous.addEventListener("click", () => goTo(-1));
next.addEventListener("click", () => goTo(1));
retry.addEventListener("click", load);
load();
