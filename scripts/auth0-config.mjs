import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

export async function loadAuth0Config(root, env = process.env) {
  const sandbox = { window: {} };
  runInNewContext(await readFile(join(root, "js", "auth-config.js"), "utf8"), sandbox);
  const defaults = sandbox.window.APP_CONFIG.auth0;
  const config = {
    domain: env.AUTH0_DOMAIN?.trim() || defaults.domain,
    clientId: env.AUTH0_CLIENT_ID?.trim() || defaults.clientId,
    audience: env.AUTH0_AUDIENCE?.trim() || defaults.audience,
  };
  const domain = new URL(`https://${config.domain}`);
  if (domain.hostname !== config.domain || domain.pathname !== "/" || domain.port || domain.search || domain.hash || domain.username || domain.password) {
    throw new Error("AUTH0_DOMAIN deve conter somente o nome do domínio, sem https://, porta, caminho ou barra final.");
  }
  if (!config.clientId || /\s/.test(config.clientId) || config.clientId.startsWith("COLE_")) {
    throw new Error("AUTH0_CLIENT_ID inválido: informe o Client ID público da aplicação SPA.");
  }
  if (!config.audience || /\s/.test(config.audience)) {
    throw new Error("AUTH0_AUDIENCE deve ser exatamente o Identifier da API, sem espaços.");
  }
  return config;
}
