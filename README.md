# Plataforma de Filmes — Frontend

Aplicação estática em HTML, CSS e JavaScript. Não precisa de `npm install`.

## Executar localmente

Na raiz do repositório:

```powershell
python -m http.server 5173
```

Acesse `http://localhost:5173`. Inicie Users em 8080 e Movies em 8081 com MongoDB e PostgreSQL, respectivamente. Os endereços locais e a aplicação Auth0 ficam em `js/auth-config.js`. Não abra o HTML diretamente por `file://`.

## Auth0: configuração necessária no painel

No tenant `dev-xiu6cdl8suiyoyc6.us.auth0.com`, selecione a aplicação com Client ID `dTCgqqmWvyFcoWA1AkYDFMjyYTFFZbyq`, do tipo **Single Page Application**.

Cadastre os endereços usados nos três campos: **Allowed Callback URLs**, **Allowed Logout URLs** e **Allowed Web Origins**:

```text
http://localhost:5173
https://plataforma-filmes-frontend.vercel.app
```

Cada campo aceita várias entradas conforme a interface do Auth0. O código usa `window.location.origin` como callback e retorno de logout. Outras portas, `127.0.0.1` e domínios de preview precisam de cadastro próprio.

Em **Applications → APIs**, a API deve ter Identifier exatamente `https://api.plataforma-filmes` e assinatura RS256. Se já existe uma API com outro Identifier, alinhe a audiência do front e dos dois backends com esse valor. O Identifier não precisa ser um domínio com DNS. Não use o Client ID como audiência e não envie ID token para as APIs.

Os dois backends devem usar:

```text
AUTH0_ISSUER_URI=https://dev-xiu6cdl8suiyoyc6.us.auth0.com/
AUTH0_AUDIENCE=https://api.plataforma-filmes
AUTH0_JWK_SET_URI=https://dev-xiu6cdl8suiyoyc6.us.auth0.com/.well-known/jwks.json
```

Esses valores já são os padrões dos serviços; variáveis de ambiente podem sobrescrevê-los. Ajustar o código não cadastra a API ou os callbacks no painel.

## CORS dos serviços

Ambos aceitam uma lista de origens exatas, sem wildcard:

```text
FRONTEND_ORIGINS=http://localhost:5173,https://plataforma-filmes-frontend.vercel.app
```

`FRONTEND_ORIGIN` singular continua funcionando como alternativa. Em produção, os workflows usam a variável de repositório GitHub `FRONTEND_ORIGINS`, cujo padrão é o domínio Vercel acima. Recrie os containers para aplicar alterações. Mesmo com proxy Vercel, o backend recebe `Origin` nas gravações e precisa aceitar a origem publicada.

## Publicar com HTTPS nas APIs

O build (`node scripts/build.mjs`) gera `dist/`, com `/api/users` e `/api/movies`. `vercel.json` encaminha as chamadas às origens **HTTPS** do gateway AWS.

**Antes de publicar esse front**, ative o gateway e confirme que as duas origens respondem com certificado válido. No repositório Movies, `deploy/Caddyfile` e `gateway.compose.yml` configuram HTTPS. `MOVIES_DOMAIN` e `USERS_DOMAIN` devem conter apenas os nomes DNS, sem `http://`, `https://` ou caminhos. DNS e portas 80/443 devem chegar à instância.

Valide pelo script `deploy/verify-public.sh` do Movies:

```bash
MOVIES_DOMAIN=filmes-plataformas-filmes.duckdns.org \
USERS_DOMAIN=user-plataformas-filmes.duckdns.org \
FRONTEND_ORIGIN=https://plataforma-filmes-frontend.vercel.app \
sh deploy/verify-public.sh
```

Não desative a validação de certificados e não restaure HTTP para transportar tokens. Só publique o front depois de o teste acima passar. O proxy Vercel não funciona no servidor estático local.

O build permite definir `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` e `AUTH0_AUDIENCE` na Vercel. São configurações públicas. Nunca coloque Client Secret no front. Sem essas variáveis, mantém os valores de `js/auth-config.js`.

## Funcionalidades e limites

- Catálogo público, busca por trecho em título/diretor/gênero, filtros e trailers do catálogo.
- Perfil próprio, seguir usuários e listas persistidas de favoritos/assistidos.
- Avaliações, publicações e comentários autenticados.
- Erro visível e opção de recarregar quando catálogo/perfil não estão disponíveis.
- Os cards ilustrativos da comunidade abrem trailers do catálogo; não representam uploads de vídeo dos usuários. Quando não existe trailer, a interface informa a indisponibilidade.

`TMDB_API_KEY` fica apenas no serviço Movies. A pesquisa de títulos ainda ausentes pode importá-los nesse serviço.

## Testes de navegador

```powershell
python -m pip install playwright
python -m playwright install chromium
python tests/browser_regression.py
```

O teste inicia um servidor local em porta dinâmica e simula SDK Auth0 e respostas de API em um navegador isolado. Não acessa contas reais nem altera dados publicados. Opcionalmente, defina `CHROME_PATH` para usar um Chrome instalado. Os testes cobrem busca, falhas/recuperação de perfil e catálogo, sessão expirada, logout único, listas e player.

## Identificar e conferir o deploy

O build gera `/build-info.json` com o commit informado pela Vercel e o horário UTC do build. Os scripts recebem hashes de conteúdo no HTML gerado. Isso permite conferir qual versão chegou ao domínio publicado; não promove deployments automaticamente.

Antes de publicar, teste o cadastro público Auth0 (Node 18 ou superior):

```powershell
node scripts/check-auth0.mjs
# Outra origem cadastrada:
node scripts/check-auth0.mjs http://localhost:5173
# Testes sem acesso externo:
node --test tests/auth0-config.test.mjs
```

O script usa os mesmos padrões e variáveis Auth0 do build. Não envia credenciais nem acessa uma conta. `login_required` é o resultado esperado sem sessão e confirma a aceitação do pedido; não substitui o teste de login real, emissão de token e acesso às APIs. A execução não faz parte obrigatória do build, para evitar dependência da disponibilidade do Auth0 durante a compilação.

O passo a passo administrativo está em `GUIA-AUTH0.md`, na raiz do repositório Users. Depois de copiar/publicar as mudanças, faça commit também dos módulos novos `scripts/auth0-config.mjs`, `scripts/check-auth0.mjs` e dos testes.
