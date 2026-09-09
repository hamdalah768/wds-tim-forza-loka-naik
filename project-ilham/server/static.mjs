import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { headers } from "./security.mjs";
const folder = fileURLToPath(new URL("../lomba-statis/", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};
export function createStaticServer(root = folder) {
  return createServer(async (req, res) => {
    headers(res, false);
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        return res.end("Metode tidak didukung.");
      }
      const url = new URL(req.url, "http://localhost");
      const path =
        decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
      if (
        !/^(?:index|belajar|materi|studio|cerita|pencarian|akun)\.html$/.test(
          path,
        ) &&
        path !== "runtime.js" &&
        !/^assets\/[a-z0-9_./-]+$/i.test(path)
      )
        throw new Error("not found");
      if (path.split("/").some((x) => x === ".." || x.startsWith(".")))
        throw new Error("not found");
      const file = resolve(root, path);
      if (!file.startsWith(resolve(root) + sep) || !types[extname(file)])
        throw new Error("not found");
      const bytes = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[extname(file)],
        "Cache-Control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : bytes);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Halaman tidak ditemukan. Kembali ke /index.html.");
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const port = Number(process.env.STATIC_PORT || 4173),
    server = createStaticServer();
  server.on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? "Port 4173 sudah digunakan. Ubah STATIC_PORT."
        : "Server statis gagal dijalankan.",
    );
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(`Versi statis siap: http://localhost:${port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      server.close();
      server.closeIdleConnections();
    });
}
