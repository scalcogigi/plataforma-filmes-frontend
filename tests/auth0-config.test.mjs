import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAuth0Config } from "../scripts/auth0-config.mjs";
import { checkAuth0 } from "../scripts/check-auth0.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://plataforma-filmes-frontend.vercel.app";
const config = {domain:"example.auth0.com",clientId:"public-client",audience:"https://api.example"};
function reply(error, description = "", target = origin) {
  return async url => {
    const location = new URL(target);
    location.search = new URLSearchParams({error,error_description:description,state:url.searchParams.get("state")});
    return new Response(null, { status:302, headers:{location:location.href} });
  };
}
test("variáveis do build prevalecem sobre os padrões locais", async () => {
  const actual = await loadAuth0Config(root, {AUTH0_DOMAIN:"other.auth0.com", AUTH0_CLIENT_ID:"other-client", AUTH0_AUDIENCE:"urn:other-api"});
  assert.deepEqual(actual, {domain:"other.auth0.com",clientId:"other-client",audience:"urn:other-api"});
});
test("domínio com protocolo é recusado", async () => {
  await assert.rejects(loadAuth0Config(root, {AUTH0_DOMAIN:"https://example.auth0.com"}), /AUTH0_DOMAIN/);
});
test("login_required confirma o pedido sem alegar login completo", async () => {
  await checkAuth0(config, origin, reply("login_required"));
});
test("audiência desconhecida produz diagnóstico específico", async () => {
  await assert.rejects(checkAuth0(config, origin, reply("access_denied","Service not found: https://api.example")), /Audiência recusada/);
});
test("callback inválido produz diagnóstico específico", async () => {
  await assert.rejects(checkAuth0(config, origin, async()=>new Response("Callback URL mismatch",{status:400})), /Callback recusado/);
});
test("retorno para outra origem é recusado", async () => {
  await assert.rejects(checkAuth0(config, origin, reply("login_required","","https://other.example")), /callback esperado/);
});
