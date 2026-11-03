import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");

function apiUrl(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configure ${name} nas variáveis de ambiente da Vercel.`);
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} precisa ser uma URL HTTPS válida.`); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error(`${name} precisa ter o formato https://dominio, sem caminho ou credenciais.`);
  }
  return url.origin;
}

const users = apiUrl("USERS_API_URL");
const movies = apiUrl("MOVIES_API_URL");

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
const config = { ...sandbox.window.APP_CONFIG, api: { users, movies } };
await writeFile(join(output, "js", "auth-config.js"), `window.APP_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`);
console.log("Front preparado com URLs HTTPS para as duas APIs.");
