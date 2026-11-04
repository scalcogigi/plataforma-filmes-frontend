# Plataforma de Filmes

Projeto acadêmico de uma plataforma para descoberta e organização de filmes e séries. A aplicação possui catálogo local, busca, filtros, favoritos, filmes assistidos, perfis de usuários, avaliações, plataformas de streaming e uma área de comunidade.

## Tecnologias

- HTML5
- CSS3
- JavaScript puro
- Movies Service para catálogo, busca e trailers
- YouTube Embed para exibição dos trailers
- Auth0 para autenticação

## Como executar o front-end

Não é necessário instalar dependências com npm. O projeto é estático e precisa ser servido por um servidor local para que os arquivos e as chamadas da API funcionem corretamente.

Abra o PowerShell nesta pasta:

```powershell
cd "C:\Users\Superframe Force\Downloads\FacLocal\2026.2\ProjAgil\plataforma-filmes-frontend"
python -m http.server 5173
```

Depois acesse:

```text
http://localhost:5173
```

Para encerrar o servidor, pressione `Ctrl + C`.

Também é possível abrir o arquivo `index.html` usando a extensão **Live Server** do VS Code.

## Catálogo e teste local com as APIs na AWS

O Movies Service consulta primeiro os títulos já salvos no PostgreSQL. Se não encontrar o título, busca na fonte externa e grava os resultados com sinopse, imagem e links de trailers do YouTube. A chave `TMDB_API_KEY` fica somente no Movies Service; o navegador nunca recebe essa chave.

Se o front roda em `http://localhost:5173` e as APIs rodam na EC2, abra **outro terminal Git Bash no seu computador** e mantenha esta conexão aberta:

```bash
ssh -i "/c/Users/Superframe Force/Downloads/FacLocal/2026.2/ProjAgil/projeto/projsoft26b.pem" -o ExitOnForwardFailure=yes -N -L 127.0.0.1:8080:127.0.0.1:8080 -L 127.0.0.1:8081:127.0.0.1:8081 ubuntu@13.221.156.86
```

Isso faz `localhost:8080` e `localhost:8081` do seu computador chegarem aos serviços na EC2. Verifique `http://localhost:8081/filmes` no navegador e recarregue o front. Se essa URL abrir, mas o front ainda mostrar erro de conexão, confira se o Movies Service permite a origem `http://localhost:5173` na configuração `FRONTEND_ORIGIN`.

Na primeira inicialização com banco vazio, o Movies Service carrega títulos populares quando `CATALOG_SEED_COUNT=20` está configurado. A aba **Filmes** também permite pesquisar novos títulos, que são gravados automaticamente. Para testar diretamente na EC2: `curl -G --data-urlencode "termo=Interestelar" http://127.0.0.1:8081/catalogo/pesquisar`.

## Funcionalidades principais

- Navegação por início, exploração, filmes, séries, lançamentos, gêneros e comunidade.
- Busca e filtros no catálogo do Movies Service.
- Favoritar filmes e marcar títulos como assistidos.
- Avaliação de filmes.
- Busca e importação de filmes e séries pelo Movies Service.
- Exibição de trailers e teasers do YouTube.
- Feed de comunidade com publicações, comentários e interações.
- Persistência de filmes e avaliações no PostgreSQL e de perfis no MongoDB.

## Backend

O backend Spring Boot está no projeto:

```text
C:\Users\Superframe Force\Downloads\FacLocal\2026.2\ProjAgil\plataforma-filmes-users
```

Para executar o backend, abra um segundo PowerShell nessa pasta e rode:

```powershell
cd "C:\Users\Superframe Force\Downloads\FacLocal\2026.2\ProjAgil\plataforma-filmes-users"
.\mvnw.cmd spring-boot:run
```

O catálogo e os perfis são carregados das APIs Movies (`localhost:8081`) e Users (`localhost:8080`). Configure `js/auth-config.js` com a aplicação Auth0 e permita `http://localhost:5173` como origem e URL de retorno. As duas APIs devem validar a mesma audiência e emissor Auth0. Inicie MongoDB e PostgreSQL conforme os READMEs dos serviços antes de abrir o front.

O catálogo usa o Movies Service, que importa filmes e séries do TMDB. Favoritos e assistidos são exibidos quando presentes no perfil, mas o Users Service ainda não oferece endpoints para alterá-los. A comunidade carrega publicações, comentários, curtidas e salvos do Movies Service; os exemplos iniciais são gravados quando a tabela de publicações está vazia. Avaliações e comentários na página de cada título também são persistidos.

### Auth0

O front envia `window.location.origin` como `redirect_uri`. Ao usar `http://localhost:5173`, configure no painel Auth0 da aplicação indicada em `js/auth-config.js`:

- **Allowed Callback URLs:** `http://localhost:5173`
- **Allowed Logout URLs:** `http://localhost:5173`
- **Allowed Web Origins:** `http://localhost:5173`

Se abrir o site em outra porta ou por `127.0.0.1`, cadastre exatamente essa origem também. O erro “Callback URL mismatch” não pode ser resolvido somente no código.

### Publicação na Vercel com proxy para a EC2

O deploy usa `vercel.json` e `scripts/build.mjs`. No build publicado, o front usa `/api/movies` e `/api/users` no próprio domínio da Vercel; as regras de rewrite encaminham essas rotas aos dois nomes DuckDNS da EC2. Em desenvolvimento local, `js/auth-config.js` continua usando `localhost:8080` e `localhost:8081`.

1. No repositório Movies, copie `deploy/Caddyfile` atualizado para `~/filmes-deploy/Caddyfile` na EC2 e recrie somente o gateway com `docker compose -f gateway.compose.yml up -d --force-recreate gateway`. Os nomes no `.env` continuam `filmes-plataformas-filmes.duckdns.org` e `user-plataformas-filmes.duckdns.org`. Confirme que a porta 80 está aberta na AWS e que `http://filmes-plataformas-filmes.duckdns.org/filmes` retorna JSON e `http://user-plataformas-filmes.duckdns.org/users` retorna 401. Não use `--remove-orphans`, pois o PostgreSQL usa outro arquivo Compose.
2. Na Vercel, importe o repositório do front, use a raiz do repositório e as configurações de `vercel.json` (Framework: Other; saída: `dist`). Não são necessárias `USERS_API_URL` nem `MOVIES_API_URL`; o projeto não precisa de `npm install`.
3. Após o deploy, teste `https://SEU-PROJETO.vercel.app/api/movies/filmes` (JSON) e `https://SEU-PROJETO.vercel.app/api/users/users` (401 sem token). O navegador acessa ambas pelo domínio HTTPS da Vercel; o proxy encaminha as chamadas à EC2. Não habilite cache para as rotas de API.
4. Configure a origem final `https://SEU-PROJETO.vercel.app` como **Allowed Callback URLs**, **Allowed Logout URLs** e **Allowed Web Origins** no Auth0. Atualize `FRONTEND_ORIGIN` dos dois backends com essa origem exata, sem `/` final, e execute seus deploys. Nunca coloque Client Secret no front.

O trecho entre a Vercel e a EC2 usa HTTP na porta 80 nesta configuração. Dados de conta e tokens de autenticação não têm criptografia nesse trecho; use HTTPS também na origem antes de liberar login e ações autenticadas para usuários reais. O erro de audiência do Auth0 observado anteriormente é independente do proxy.

Para conferir apenas o build, execute `node scripts/build.mjs`; o resultado fica em `dist/`. As regras de proxy funcionam somente quando a aplicação está publicada na Vercel.

### Catálogo TMDB

Configure `TMDB_API_KEY` no Movies Service. A pesquisa em Explorar/Filmes, ou Enter na busca superior, consulta primeiro o PostgreSQL; se não encontrar o título, importa até cinco resultados de filmes/séries, usando tipo e ID externo para evitar duplicatas. Também são salvos sinopse, imagem e até cinco links de trailers do YouTube. Para uma lista inicial, configure `CATALOG_SEED_COUNT=20` antes de iniciar o Movies Service com banco vazio (máximo 40); também existe `POST /catalogo/populares?quantidade=20` com token Auth0. O Movies Service precisa estar conectado ao PostgreSQL. Avaliações e comentários de cada conta são salvos pelo serviço de filmes.
