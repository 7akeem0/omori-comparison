const reader = document.querySelector("#translation-reader");
const search = reader.querySelector("#translation-search");
const rows = reader.querySelector("#translation-rows");
const status = reader.querySelector("#translation-status");
const previous = reader.querySelector("#translation-prev");
const next = reader.querySelector("#translation-next");
const pageSize = 50;
let entries;
let results = [];
let page = 0;
let loading = false;

function normalize(text) {
  return text.toLowerCase().normalize("NFKD").replace(/\p{Mark}|ـ/gu, "")
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/\s+/g, " ").trim();
}

function readable(text) {
  return text.replace(/\\n\[8\]/gi, "[اسم اللاعب]")
    .replace(/<br\s*\/?>|\\n(?![a-z\[<])/gi, "\n")
    .replace(/\\(?:[a-z]+(?:\[[^\]\r\n]*\]|<[^>\r\n]*>)?|[!.|^{}<>$])/gi, "")
    .replace(/\\(["'#])/g, "$1")
    .trim() || text;
}

function parse(text) {
  const headers = [...text.matchAll(/^(\d+)\) \[[^\r\n]+\]\r?$/gm)];
  if (headers.length !== Number(reader.dataset.count)) throw new Error("Unexpected entry count");

  return headers.map((header, index) => {
    const start = header.index + header[0].length;
    const end = headers[index + 1]?.index ?? text.length;
    const body = readable(text.slice(start, end).trim());
    return { id: header[1], body, searchable: normalize(body) };
  });
}

function render() {
  const start = page * pageSize;
  const batch = results.slice(start, start + pageSize);
  const fragment = document.createDocumentFragment();

  for (const { id, body } of batch) {
    const item = document.createElement("li");
    const number = document.createElement("bdi");
    const text = document.createElement("p");
    number.textContent = "#" + id;
    text.textContent = body;
    item.append(number, text);
    fragment.append(item);
  }

  rows.replaceChildren(fragment);
  status.textContent = batch.length
    ? `${start + 1}–${start + batch.length} من ${results.length.toLocaleString("en-US")}`
    : "لا توجد نتائج لهذا البحث.";
  previous.disabled = page === 0;
  next.disabled = start + pageSize >= results.length;
}

function filter() {
  const query = normalize(search.value);
  const id = /^#?(\d+)$/.exec(query);
  results = !query ? entries : entries.filter(entry => id ? entry.id === id[1] : entry.searchable.includes(query));
  page = 0;
  render();
}

async function load() {
  if (!reader.open || loading || entries) return;
  loading = true;
  status.textContent = "جارٍ تحميل النص…";
  try {
    const response = await fetch(reader.dataset.source);
    if (!response.ok) throw new Error("Download failed");
    entries = parse(await response.text());
    search.disabled = false;
    filter();
  } catch {
    status.textContent = "تعذّر تحميل النص. أغلق القسم وافتحه للمحاولة مرة أخرى، أو حمّل الملف.";
  } finally {
    loading = false;
  }
}

function goTo(offset) {
  page += offset;
  render();
  rows.focus({ preventScroll: true });
  rows.scrollIntoView({ block: "start" });
}

reader.addEventListener("toggle", load);
search.addEventListener("input", filter);
previous.addEventListener("click", () => goTo(-1));
next.addEventListener("click", () => goTo(1));
load();
