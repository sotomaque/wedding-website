/**
 * Tiny HTTP server that serves the local Lovebird SingleFile capture on
 * http://localhost:4000/ so you can keep the source template open in a
 * browser tab while we rebuild ours side-by-side.
 *
 * Run: bun run scripts/serve-lovebird.mjs
 */
import fs from "node:fs";
import http from "node:http";

const HTML_PATH =
  "C:\\Users\\abelm\\Downloads\\Elegant Wedding Guest Communication ｜ Lovebird (5_25_2026 4：40：41 PM).html";
const PORT = 4000;

const html = fs.readFileSync(HTML_PATH);

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": html.length,
  });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`Lovebird template serving at http://localhost:${PORT}/`);
});
