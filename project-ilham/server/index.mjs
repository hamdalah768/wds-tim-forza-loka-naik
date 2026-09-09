import { createApp } from "./app.mjs";
const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "127.0.0.1";
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT harus 1–65535.");
const { server, origin } = createApp();
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? "Port sudah digunakan. Ubah PORT dan APP_ORIGIN di .env."
      : "Server tidak dapat dijalankan. Periksa konfigurasi.",
  );
  process.exitCode = 1;
});
server.listen(port, host, () =>
  console.log(
    `LokaNaik siap: ${origin}\nBuka alamat tersebut di browser. Tekan Ctrl+C untuk berhenti.`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close();
    server.closeIdleConnections();
  });
