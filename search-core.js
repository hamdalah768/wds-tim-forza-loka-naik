/* Shared search implementation, run in the browser and by the Node API. */
window.LOKA_SEARCH = function searchLessons(
  query = "",
  category = "Semua",
  sort = "relevansi",
) {
  const normalize = (value) =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("id")
      .trim();
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const found = window.LOKA_CONTENT.lessons
    .map((lesson, index) => {
      const hay = normalize(
        `${lesson.title} ${lesson.category} ${lesson.summary} ${lesson.keywords}`,
      );
      const score = terms.every((term) => hay.includes(term))
        ? terms.reduce(
            (sum, term) =>
              sum + (normalize(lesson.title).includes(term) ? 4 : 1),
            0,
          ) + 1
        : 0;
      return { lesson, index, score };
    })
    .filter(
      (row) =>
        row.score > 0 &&
        (category === "Semua" || row.lesson.category === category),
    );
  found.sort((a, b) =>
    sort === "durasi"
      ? a.lesson.time - b.lesson.time
      : b.score - a.score || a.index - b.index,
  );
  return found.map((row) => row.lesson);
};
