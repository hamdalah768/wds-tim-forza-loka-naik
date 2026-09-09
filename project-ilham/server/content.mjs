import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
// The local editorial file is trusted application code, never user-supplied code.
const context = { window: {} };
runInNewContext(
  readFileSync(
    new URL("../public/assets/js/content.js", import.meta.url),
    "utf8",
  ),
  context,
);
runInNewContext(
  readFileSync(
    new URL("../public/assets/js/search-core.js", import.meta.url),
    "utf8",
  ),
  context,
);
export const content = context.window.LOKA_CONTENT;
export function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id")
    .trim();
}
export function searchLessons(
  query = "",
  category = "Semua",
  sort = "relevansi",
) {
  return context.window.LOKA_SEARCH(query, category, sort);
}
