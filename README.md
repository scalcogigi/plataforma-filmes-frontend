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
python -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500
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
C:\Users\Superframe Force\Downloads\FacLocal\2026.2\ProjAgil\untitled1
```

Para executar o backend, abra um segundo PowerShell nessa pasta e rode:

```powershell
cd "C:\Users\Superframe Force\Downloads\FacLocal\2026.2\ProjAgil\untitled1"
.\mvnw.cmd spring-boot:run
```

O front-end atual funciona de forma independente usando dados locais. A integração com o backend pode ser conectada posteriormente para substituir o `localStorage` por persistência no servidor.
