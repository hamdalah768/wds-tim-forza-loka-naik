import { test } from "node:test";
import assert from "node:assert/strict";
import { content, searchLessons } from "../server/content.mjs";
import { escape, lessonCard } from "../scripts/ui.mjs";
import { readFile, readdir } from "node:fs/promises";
test("semua topik memiliki URL unik, 3 bagian, latihan, dan rujukan HTTPS", () => {
  assert.equal(new Set(content.lessons.map((l) => l.slug)).size, 3);
  for (const lesson of content.lessons) {
    assert.match(lesson.slug, /^[a-z-]+$/);
    assert.equal(lesson.chapters.length, 3);
    assert.equal(lesson.tasks.length, 3);
    assert.equal(lesson.answers.length, 3);
    assert.ok(lesson.correct >= 0 && lesson.correct < 3);
    for (const resource of lesson.resources)
      assert.equal(new URL(resource.url).protocol, "https:");
  }
});
test("pencarian menghubungkan keripik pisang dengan materi yang relevan", () => {
  assert.ok(
    searchLessons("keripik pisang").some((l) => l.slug === "cahaya-jendela"),
  );
  assert.ok(
    searchLessons("  RÉFLEKTOR ").some((l) => l.slug === "reflektor-sederhana"),
  );
  assert.equal(searchLessons("tidakditemukan").length, 0);
  assert.equal(searchLessons("", "Foto Produk").length, 3);
});
test("teks berbahaya di-escape saat dirender sebagai HTML", () => {
  assert.equal(
    escape('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
  const html = lessonCard({
    ...content.lessons[0],
    title: "<script>alert(1)</script>",
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
test("materi, FAQ, dan formulir memiliki semantik aksesibel", async () => {
  const html = await readFile(
    new URL("../public/index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /id="bagian-posisi"/);
  assert.match(html, /id="bagian-sudut"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /type="range"/);
  const cerita = await readFile(
    new URL("../public/index.html", import.meta.url),
    "utf8",
  );
  assert.equal((cerita.match(/<details class="faq"/g) || []).length, 11);
  assert.match(cerita, /href="tel:/);
  assert.match(cerita, /https:\/\/wa.me\//);
  const akun = await readFile(
    new URL("../public/index.html", import.meta.url),
    "utf8",
  );
  assert.match(akun, /autocomplete="current-password"/);
  assert.match(akun, /autocomplete="new-password"/);
  assert.match(akun, /minlength="15"/);
  assert.doesNotMatch(akun, /<form[^>]*method="get"/i);
});
test("ekspor lomba tepat satu halaman dan tidak memakai framework frontend", async () => {
  const files = await readdir(new URL("../lomba-statis/", import.meta.url));
  assert.equal(files.filter((f) => f.endsWith(".html")).length, 1);
  for (const file of files.filter((f) => f.endsWith(".html"))) {
    const html = await readFile(
      new URL(`../lomba-statis/${file}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(html, /cdn\.tailwindcss|react|three\.js|gsap|jquery/i);
    assert.doesNotMatch(html, /href="#"/);
  }
});
