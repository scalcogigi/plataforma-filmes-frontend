import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadAuth0Config } from "./auth0-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");
const auth0 = await loadAuth0Config(root);

await rm(output, { recursive: true, force: true });
await mkdir(join(output, "js"), { recursive: true });
await Promise.all([
  cp(join(root, "index.html"), join(output, "index.html")),
  cp(join(root, "css"), join(output, "css"), { recursive: true }),
  cp(join(root, "assets"), join(output, "assets"), { recursive: true }),
  cp(join(root, "js"), join(output, "js"), { recursive: true }),
]);

const config = { auth0, api: { users: "/api/users", movies: "/api/movies" } };
await writeFile(join(output, "js", "auth-config.js"), `window.APP_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`);
const buildInfo = {
  commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
  builtAt: new Date().toISOString(),
};
await writeFile(join(output, "build-info.json"), JSON.stringify(buildInfo, null, 2) + "\n");
let html = await readFile(join(output, "index.html"), "utf8");
const scripts = [...html.matchAll(/src="(js\/[^"?]+\.js)(?:\?[^"\s]*)?"/g)];
for (const [original, path] of scripts) {
  const hash = createHash("sha256").update(await readFile(join(output, path))).digest("hex").slice(0, 12);
  html = html.replace(original, `src="${path}?v=${hash}"`);
}
await writeFile(join(output, "index.html"), html);
console.log(`Front preparado. Commit: ${buildInfo.commit}. Metadados públicos em /build-info.json.`);
