# Plataforma de Filmes

Projeto acadêmico de uma plataforma para descoberta e organização de filmes e séries. A aplicação possui catálogo local, busca, filtros, favoritos, filmes assistidos, perfis de usuários, avaliações, plataformas de streaming e uma área de comunidade.

## Tecnologias

- HTML5
- CSS3
- JavaScript puro
- TMDB API para consulta de filmes e trailers
- YouTube Embed para exibição dos trailers
- `localStorage` para persistência dos dados locais

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

## Configuração da TMDB

A busca de trailers está disponível em **Filmes → Buscar trailers no TMDB**.

1. Crie uma conta gratuita em [themoviedb.org](https://www.themoviedb.org/).
2. Solicite uma chave em **Settings → API**.
3. Abra o arquivo `js/tmdb.js`.
4. Substitua o valor abaixo pela sua chave:

```js
const API_KEY = "COLE_SUA_CHAVE_TMDB_AQUI";
```

O projeto consulta os filmes na TMDB e mostra trailers disponíveis no YouTube. A TMDB é gratuita para uso não comercial, mas exige atribuição.

Inclua no projeto a mensagem:

> Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.

## Segurança da chave

Como este front-end é estático, qualquer chave colocada em `js/tmdb.js` poderá ser visualizada no navegador. Para um ambiente de produção, a integração deve ser movida para o backend Spring Boot, usando uma variável de ambiente como `TMDB_API_KEY`.

Não publique a chave em um repositório público.

## Funcionalidades principais

- Navegação por início, exploração, filmes, séries, lançamentos, gêneros e comunidade.
- Cadastro, edição e exclusão lógica de filmes e usuários.
- Busca e filtros no catálogo local.
- Favoritar filmes e marcar títulos como assistidos.
- Avaliação de filmes.
- Cadastro de plataformas onde o título está disponível.
- Busca de filmes na TMDB.
- Exibição de trailers e teasers do YouTube.
- Feed de comunidade com publicações, comentários e interações.
- Persistência local dos dados usando `localStorage`.

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

### Catálogo TMDB

Configure `TMDB_API_KEY` no Movies Service. A pesquisa em Explorar/Filmes, ou Enter na busca superior, consulta primeiro o PostgreSQL; se não encontrar o título, importa até cinco resultados de filmes/séries, usando tipo e ID externo para evitar duplicatas. Também são salvos sinopse, imagem e até cinco links de trailers do YouTube. Para uma lista inicial, configure `CATALOG_SEED_COUNT=20` antes de iniciar o Movies Service com banco vazio (máximo 40); também existe `POST /catalogo/populares?quantidade=20` com token Auth0. O Movies Service precisa estar conectado ao PostgreSQL. Avaliações e comentários de cada conta são salvos pelo serviço de filmes.
