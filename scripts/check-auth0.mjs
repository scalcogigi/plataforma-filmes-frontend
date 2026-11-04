import { randomBytes, createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAuth0Config } from "./auth0-config.mjs";

export async function checkAuth0(config, origin, fetchFn = fetch) {
  const callback = new URL(origin);
  if (!["http:", "https:"].includes(callback.protocol) || callback.origin !== origin) {
    throw new Error("Informe a origem exata do front, sem barra final ou caminho.");
  }
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL(`https://${config.domain}/authorize`);
  url.search = new URLSearchParams({
    client_id: config.clientId, redirect_uri: origin, response_type: "code",
    scope: "openid profile email", audience: config.audience, prompt: "none", state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256",
  });
  const response = await fetchFn(url, { redirect: "manual", signal: AbortSignal.timeout(15000) });
  const location = response.headers.get("location");
  if (!location) {
    const text = await response.text();
    if (text.includes("Callback URL mismatch")) throw new Error(`Callback recusado. Cadastre ${origin} em Allowed Callback URLs da aplicação ${config.clientId}.`);
    throw new Error(`Auth0 respondeu HTTP ${response.status} sem retorno ao callback. Consulte Monitoring > Logs no painel.`);
  }
  const redirect = new URL(location, url);
  if (redirect.origin !== origin) throw new Error("Auth0 não retornou ao callback esperado. Confira a aplicação e os logs do tenant.");
  if (redirect.searchParams.get("state") !== state) throw new Error("O retorno Auth0 não corresponde ao teste iniciado.");
  const error = redirect.searchParams.get("error");
  const description = redirect.searchParams.get("error_description") || "";
  if (error === "login_required") return;
  if (description.includes("Service not found")) throw new Error(`Audiência recusada: ${config.audience}. Confira Applications > APIs > Identifier no tenant ${config.domain}.`);
  throw new Error(`Auth0 recusou o teste (${error || "retorno inesperado"}). Consulte Monitoring > Logs; não compartilhe tokens ou senhas.`);
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  try {
    const root = resolve(dirname(scriptPath), "..");
    const origin = process.argv[2] || process.env.FRONTEND_ORIGIN || "https://plataforma-filmes-frontend.vercel.app";
    const config = await loadAuth0Config(root);
    console.log(`Verificando Auth0: tenant=${config.domain}, clientId=${config.clientId}, audience=${config.audience}, callback=${origin}`);
    await checkAuth0(config, origin);
    console.log("OK: cliente, callback e audiência aceitos no pedido público. login_required é esperado sem sessão. Falta validar login real e as APIs.");
  } catch (error) {
    console.error(`FALHA: ${error.message}`);
    process.exitCode = 1;
  }
}
