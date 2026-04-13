/**
 * Render Server — Remotion 컨테이너 내부에서 실행 (포트 3003)
 * POST /render   → npx remotion render 실행
 * GET  /status   → 렌더 상태 확인
 * GET  /download → out.mp4 다운로드
 */
import { createServer } from "http";
import { exec } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "out.mp4");
const DATA_PATH = join(__dirname, "public", "data.json");

let renderState = { status: "idle", error: null }; // idle | rendering | done | error

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

createServer((req, res) => {
  cors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // POST /render
  if (req.method === "POST" && req.url === "/render") {
    if (renderState.status === "rendering") {
      res.writeHead(409, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "이미 렌더링 중입니다" }));
    }

    renderState = { status: "rendering", error: null };
    const cmd = [
      "npx remotion render HelloWorld",
      `"${OUTPUT_PATH}"`,
      `--props="${DATA_PATH}"`,
      "--audio-codec=mp3",
      "--log=verbose",
    ].join(" ");

    exec(cmd, { cwd: __dirname, timeout: 600_000 }, (err, _stdout, stderr) => {
      if (err) {
        console.error("[RenderServer] error:", stderr);
        renderState = { status: "error", error: stderr || err.message };
      } else {
        renderState = { status: "done", error: null };
        console.log("[RenderServer] render complete →", OUTPUT_PATH);
      }
    });

    res.writeHead(202, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ accepted: true }));
  }

  // GET /status
  if (req.method === "GET" && req.url === "/status") {
    const fileExists = existsSync(OUTPUT_PATH);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ...renderState, fileReady: fileExists }));
  }

  // GET /download
  if (req.method === "GET" && req.url === "/download") {
    if (!existsSync(OUTPUT_PATH)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "렌더링된 파일이 없습니다" }));
    }
    const data = readFileSync(OUTPUT_PATH);
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Disposition": 'attachment; filename="hbas_render.mp4"',
      "Content-Length": data.length,
    });
    return res.end(data);
  }

  // GET /health
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }

  res.writeHead(404);
  res.end("Not found");
}).listen(3003, () => {
  console.log("[RenderServer] listening on port 3003");
});
