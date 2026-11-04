import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");

await rm(output, { recursive: true, force: true });
await mkdir(join(output, "js"), { recursive: true });
await Promise.all([
  cp(join(root, "index.html"), join(output, "index.html")),
  cp(join(root, "css"), join(output, "css"), { recursive: true }),
  cp(join(root, "assets"), join(output, "assets"), { recursive: true }),
  cp(join(root, "js"), join(output, "js"), { recursive: true }),
]);

const sandbox = { window: {} };
runInNewContext(await readFile(join(root, "js", "auth-config.js"), "utf8"), sandbox);
const defaults = sandbox.window.APP_CONFIG;
const config = {
  ...defaults,
  auth0: {
    domain: process.env.AUTH0_DOMAIN?.trim() || defaults.auth0.domain,
    clientId: process.env.AUTH0_CLIENT_ID?.trim() || defaults.auth0.clientId,
    audience: process.env.AUTH0_AUDIENCE?.trim() || defaults.auth0.audience,
  },
  api: { users: "/api/users", movies: "/api/movies" },
};
await writeFile(join(output, "js", "auth-config.js"), `window.APP_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`);
console.log("Front preparado para usar as APIs pelo proxy da Vercel.");
