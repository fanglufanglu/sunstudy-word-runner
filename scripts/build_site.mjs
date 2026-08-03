import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "dist");
const serverDir = path.join(outDir, "server");
const files = [
  "index.html",
  "styles.css",
  "words.js",
  "focus-units.js",
  "app.js",
  "manifest.webmanifest",
  "icon.svg",
  "service-worker.js"
];

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

await rm(outDir, { recursive: true, force: true });
await mkdir(serverDir, { recursive: true });

const assets = {};
for (const file of files) {
  const body = await readFile(path.join(root, file), "utf8");
  assets[`/${file}`] = {
    body,
    contentType: contentTypes[path.extname(file)] || "application/octet-stream"
  };
}
assets["/"] = assets["/index.html"];

const worker = `const ASSETS = ${JSON.stringify(assets)};

function normalizePath(pathname) {
  if (pathname === "" || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname + "index.html" : pathname;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = ASSETS[normalizePath(url.pathname)] || ASSETS["/"];
    return new Response(asset.body, {
      headers: {
        "content-type": asset.contentType,
        "cache-control": url.pathname === "/service-worker.js" ? "no-cache" : "public, max-age=300"
      }
    });
  }
};
`;

await writeFile(path.join(serverDir, "index.js"), worker);
