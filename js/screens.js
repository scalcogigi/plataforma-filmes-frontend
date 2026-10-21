(function () {
  const handled = new Set([
    "open-movie", "open-user", "new-movie", "edit-movie", "delete-movie", "restore-movie",
    "toggle-watched", "toggle-favorite", "new-user", "edit-user", "delete-user", "toggle-follow",
    "pick-genre", "back-view", "add-platform", "remove-platform",
  ]);

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function score(value) {
    return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function when(iso) {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  }

  function prefix() {
    return App.state.query.trim();
  }

  function notice() {
    return App.state.notice ? `<p class="notice" role="alert">${esc(App.state.notice)}</p>` : "";
  }

  function backButton() {
    return `<button class="btn-ghost" type="button" data-action="back-view">Voltar</button>`;
  }

  function poster(item) {
    if (!item.imagem) return `<div class="poster poster-empty">${esc(item.nome.slice(0, 1))}</div>`;
    return `<div class="poster"><img src="${esc(item.imagem)}" alt=""></div>`;
  }

  function cards(items, empty = "Nenhum título encontrado.") {
    if (!items.length) return `<p class="catalog-empty">${esc(empty)}</p>`;
    return `<div class="catalog-grid">${items.map((item) => `
      <button class="poster-card" type="button" data-action="open-movie" data-id="${esc(item.id)}">
        ${poster(item)}
        <span class="poster-copy">
          <strong>${esc(item.nome)}</strong>
          <small>${esc(item.ano)} · ${esc(item.genero)}</small>
          <small class="score">★ ${score(item.avaliacao)} · ID ${esc(item.id)}</small>
        </span>
      </button>`).join("")}</div>`;
  }

  function people(items, empty = "Nenhum usuário encontrado.") {
    if (!items.length) return `<p class="catalog-empty">${esc(empty)}</p>`;
    return `<div class="people">${items.map((item) => `
      <button class="person" type="button" data-action="open-user" data-id="${esc(item.id)}">
        <span class="avatar neutral">${esc(item.displayName.slice(0, 1))}${item.foto ? `<img src="${esc(item.foto)}" alt="">` : ""}</span>
        <span><strong>${esc(item.displayName)}</strong><small>@${esc(item.username)} · ID ${esc(item.id)}</small></span>
      </button>`).join("")}</div>`;
  }

  function field(name, label, control, errors) {
    const message = errors && errors[name] ? `<small class="field-error">${esc(errors[name])}</small>` : "";
    return `<label class="field">${label}${control}${message}</label>`;
  }

  function input(name, value, type = "text") {
    return `<input name="${name}" type="${type}" value="${esc(value ?? "")}">`;
  }

  function platformRows(rows, errors) {
    const list = rows && rows.length ? rows : [{ nome: "", url: "" }];
    return list.map((row, index) => `
      <div class="platform-row">
        <label class="field">Nome
          <input name="plataforma-nome" value="${esc(row.nome || "")}">
          ${errors && errors[`plataforma-${index}`] ? `<small class="field-error">${esc(errors[`plataforma-${index}`])}</small>` : ""}
        </label>
        <label class="field">URL
          <input name="plataforma-url" value="${esc(row.url || "")}" placeholder="https://">
          ${errors && errors[`plataforma-url-${index}`] ? `<small class="field-error">${esc(errors[`plataforma-url-${index}`])}</small>` : ""}
        </label>
        <button class="btn-ghost" type="button" data-action="remove-platform">Remover</button>
      </div>`).join("");
  }

  function readPlatforms(form) {
    return [...form.querySelectorAll(".platform-row")].map((row) => ({
      nome: row.querySelector("[name='plataforma-nome']").value.trim(),
      url: row.querySelector("[name='plataforma-url']").value.trim(),
    }));
  }

  function head(title, text, extra = "") {
    document.title = title;
    return `<header class="screen-head"><div><h1 class="screen-title">${esc(title)}</h1>${text ? `<p class="page-sub">${text}</p>` : ""}</div>${extra}</header>`;
  }

  function lookup(formName, placeholder) {
    return `<form class="lookup" data-form="${formName}" novalidate>
      <input name="id" type="text" placeholder="${placeholder}" aria-label="${placeholder}">
      <button class="btn-accent" type="submit">Buscar ID</button>
    </form>`;
  }

  function filterLine(kind) {
    const query = prefix();
    if (!query) return "";
    return `<p class="filter-line">${kind === "usuario" ? "Nomes que começam com" : "Títulos que começam com"} “${esc(query)}”.</p>`;
  }

  function renderHome() {
    const movies = Catalog.listMovies({ prefix: prefix() }).slice(0, 8);
    return `${head("Início", "Filmes ativos e pessoas da comunidade.")}
      ${notice()}
      <div class="stat-row">
        <article class="stat"><strong>${Catalog.activeCount()}</strong><span>filmes ativos</span></article>
        <article class="stat"><strong>${Catalog.listUsers().length}</strong><span>usuários</span></article>
        <article class="stat"><strong>${Catalog.me().favoritos.length}</strong><span>na sua lista</span></article>
      </div>
      <div class="section-head"><h2>No catálogo</h2></div>
      ${filterLine("filme")}
      ${cards(movies)}`;
  }

  function renderExplore() {
    return `${head("Explorar", "A busca de cima filtra pelo início do nome. O ID abre o registro exato.")}
      ${notice()}
      <div class="lookup-row">${lookup("lookup-movie", "ID do filme")}${lookup("lookup-user", "ID do usuário")}</div>
      ${filterLine("filme")}
      <div class="section-head"><h2>Filmes</h2><button class="btn-accent" type="button" data-action="new-movie">Cadastrar filme</button></div>
      ${cards(Catalog.listMovies({ prefix: prefix() }))}
      <div class="section-head"><h2>Usuários</h2><button class="btn-accent" type="button" data-action="new-user">Criar usuário</button></div>
      ${filterLine("usuario")}
      ${people(Catalog.listUsers(prefix()))}`;
  }

  function renderList() {
    const current = Catalog.me();
    const favorites = current.favoritos.map((id) => Catalog.getMovie(id)).filter((item) => item.ok).map((item) => item.movie);
    const watched = current.assistidos.map((id) => Catalog.getMovie(id)).filter((item) => item.ok).map((item) => item.movie);
    return `${head("Minha lista", "Filmes favoritos e filmes que você já assistiu.")}
      ${notice()}
      <div class="section-head"><h2>Favoritos</h2></div>
      ${cards(favorites, "Você ainda não favoritou um filme.")}
      <div class="section-head"><h2>Assistidos</h2></div>
      ${cards(watched, "Você ainda não marcou um filme como assistido.")}`;
  }

  function renderMovies() {
    const inactive = Catalog.inactiveCount();
    return `${head("Filmes", "Lista dos filmes ativos. A busca usa o início do nome.", `<button class="btn-accent" type="button" data-action="new-movie">Cadastrar filme</button>`)}
      <section class="block"><h2>Buscar filmes e séries no TMDB</h2><p class="muted">Pesquise um filme ou série e veja trailers disponíveis no YouTube.</p>
        <form class="inline-form" data-form="tmdb-search"><input name="query" type="search" placeholder="Ex.: Interestelar ou The Last of Us" required><button class="btn-accent" type="submit">Buscar</button></form>
        <div id="tmdb-results"></div>
      </section>
      ${notice()}
      <div class="lookup-row">${lookup("lookup-movie", "Buscar filme por ID")}</div>
      ${filterLine("filme")}
      ${cards(Catalog.listMovies({ prefix: prefix() }))}
      <div class="section-head"><h2>Excluídos logicamente</h2><span class="muted">${inactive}</span></div>
      ${inactive ? cards(Catalog.listMovies({ prefix: prefix(), active: false })) : `<p class="catalog-empty">Nenhum filme foi excluído.</p>`}`;
  }

  function renderSeries() {
    return `${head("Séries", "Títulos cadastrados com o tipo série.")}
      ${notice()}${filterLine("filme")}
      ${cards(Catalog.listMovies({ prefix: prefix(), tipo: "serie" }), "Nenhuma série cadastrada.")}`;
  }

  function renderReleases() {
    return `${head("Lançamentos", "Ativos ordenados do ano mais recente para o mais antigo.")}
      ${notice()}${filterLine("filme")}
      ${cards(Catalog.listMovies({ prefix: prefix(), sort: "ano" }))}`;
  }

  function renderGenres() {
    const selected = App.state.genre;
    const chips = Catalog.genres().map((genre) => `
      <button class="chip ${genre === selected ? "is-on" : ""}" type="button" data-action="pick-genre" data-genre="${esc(genre)}">${esc(genre)}</button>`).join("");
    return `${head("Gêneros", "Escolha um gênero para filtrar os títulos ativos.")}
      ${notice()}
      <div class="chips">${chips}</div>
      ${filterLine("filme")}
      ${cards(Catalog.listMovies({ prefix: prefix(), genero: selected || undefined }))}`;
  }

  function renderMovie(id) {
    const result = Catalog.getMovie(id);
    if (!result.ok) return `${head("Filme")}${notice() || `<p class="notice" role="alert">${esc(result.error)}</p>`}${backButton()}`;
    const item = result.movie;
    const current = Catalog.me();
    const errors = App.state.formErrors || {};
    const values = App.state.formValues || {};
    const watched = current.assistidos.includes(item.id);
    const favorite = current.favoritos.includes(item.id);
    const links = item.plataformas.length ? item.plataformas.map((platform) => `
      <a class="platform-link" href="${esc(platform.url)}" target="_blank" rel="noopener noreferrer">${esc(platform.nome)}</a>`).join("") : `<p class="muted">Nenhuma plataforma cadastrada.</p>`;
    return `${head(item.nome, `${item.ano} · ${item.genero} · ${item.tipo === "serie" ? "Série" : "Filme"}`)}
      ${notice()}
      <div class="detail">
        ${poster(item)}
        <div class="detail-copy">
          <p class="muted">ID ${esc(item.id)} · ${item.ativo ? "Ativo" : "Excluído logicamente"}</p>
          <p class="detail-score">★ ${score(item.avaliacao)}</p>
          <p class="detail-text">${esc(item.sinopse)}</p>
          <div class="actions-row">
            ${backButton()}
            <button class="btn-ghost ${watched ? "is-on" : ""}" type="button" data-action="toggle-watched" data-id="${esc(item.id)}">${watched ? "Assistido" : "Marcar como assistido"}</button>
            <button class="btn-ghost ${favorite ? "is-on" : ""}" type="button" data-action="toggle-favorite" data-id="${esc(item.id)}">${favorite ? "Favorito" : "Favoritar"}</button>
            <button class="btn-accent" type="button" data-action="edit-movie" data-id="${esc(item.id)}">Editar dados</button>
            ${item.ativo
              ? `<button class="btn-danger" type="button" data-action="delete-movie" data-id="${esc(item.id)}">Excluir</button>`
              : `<button class="btn-accent" type="button" data-action="restore-movie" data-id="${esc(item.id)}">Reativar</button>`}
          </div>
          <section class="block">
            <h2>Avaliação</h2>
            <form class="inline-form" data-form="rating-form" data-id="${esc(item.id)}" novalidate>
              <input name="avaliacao" type="text" inputmode="decimal" value="${esc(values.avaliacao ?? score(item.avaliacao))}" aria-label="Avaliação">
              <button class="btn-accent" type="submit">Atualizar avaliação</button>
              ${errors.avaliacao ? `<small class="field-error">${esc(errors.avaliacao)}</small>` : ""}
            </form>
          </section>
          <section class="block">
            <h2>Plataformas</h2>
            <div class="platform-links">${links}</div>
            <form data-form="platforms-form" data-id="${esc(item.id)}" novalidate>
              <div class="platform-list">${platformRows(values.plataformas || item.plataformas, errors)}</div>
              <div class="actions-row">
                <button class="btn-ghost" type="button" data-action="add-platform">Adicionar plataforma</button>
                <button class="btn-accent" type="submit">Atualizar plataformas</button>
              </div>
            </form>
          </section>
          <p class="muted">Criado em ${when(item.criadoEm)} · Atualizado em ${when(item.atualizadoEm)}</p>
        </div>
      </div>`;
  }

  function renderMovieForm(id) {
    const existing = id ? Catalog.getMovie(id) : null;
    if (id && !existing.ok) return `${head("Filme")}<p class="notice" role="alert">${esc(existing.error)}</p>${backButton()}`;
    const base = existing && existing.ok ? existing.movie : { nome: "", ano: "", genero: "", tipo: "filme", sinopse: "", avaliacao: "", imagem: "", plataformas: [{ nome: "", url: "" }] };
    const values = App.state.formValues || base;
    const errors = App.state.formErrors || {};
    return `${head(id ? "Editar filme" : "Cadastrar filme", "Todos os dados do filme são validados antes de salvar.")}
      ${notice()}
      <form class="sheet" data-form="movie-form" data-id="${esc(id || "")}" novalidate>
        ${field("nome", "Nome", input("nome", values.nome), errors)}
        <div class="split">
          ${field("ano", "Ano", input("ano", values.ano), errors)}
          ${field("genero", "Gênero", input("genero", values.genero), errors)}
        </div>
        ${field("tipo", "Tipo", `<select name="tipo">
          <option value="filme" ${values.tipo !== "serie" ? "selected" : ""}>Filme</option>
          <option value="serie" ${values.tipo === "serie" ? "selected" : ""}>Série</option>
        </select>`, errors)}
        ${field("sinopse", "Sinopse", `<textarea name="sinopse" rows="4">${esc(values.sinopse || "")}</textarea>`, errors)}
        ${field("avaliacao", "Avaliação (0 a 10)", input("avaliacao", values.avaliacao), errors)}
        ${field("imagem", "Imagem", input("imagem", values.imagem, "text"), errors)}
        <div class="block">
          <h2>Plataformas</h2>
          <div class="platform-list">${platformRows(values.plataformas, errors)}</div>
          <button class="btn-ghost" type="button" data-action="add-platform">Adicionar plataforma</button>
        </div>
        <div class="actions-row">${backButton()}<button class="btn-accent" type="submit">${id ? "Salvar alterações" : "Cadastrar"}</button></div>
      </form>`;
  }

  function renderProfile(id) {
    const result = Catalog.getUser(id);
    if (!result.ok) return `${head("Usuário")}<p class="notice" role="alert">${esc(result.error)}</p>${backButton()}`;
    const item = result.user;
    const current = Catalog.me();
    const mine = item.id === current.id;
    const following = current.seguindo.includes(item.id);
    const watched = item.assistidos.map((entry) => Catalog.getMovie(entry)).filter((entry) => entry.ok).map((entry) => entry.movie);
    const favorites = item.favoritos.map((entry) => Catalog.getMovie(entry)).filter((entry) => entry.ok).map((entry) => entry.movie);
    const followers = item.seguidores.map((entry) => Catalog.getUser(entry)).filter((entry) => entry.ok).map((entry) => entry.user);
    const followingUsers = item.seguindo.map((entry) => Catalog.getUser(entry)).filter((entry) => entry.ok).map((entry) => entry.user);
    return `${head(item.displayName, `@${item.username}`)}
      ${notice()}
      <div class="profile">
        <span class="avatar xl neutral">${esc(item.displayName.slice(0, 1))}${item.foto ? `<img src="${esc(item.foto)}" alt="">` : ""}</span>
        <div>
          <p>${esc(item.bio || "Sem biografia.")}</p>
          <dl class="facts">
            <div><dt>ID</dt><dd>${esc(item.id)}</dd></div>
            <div><dt>Auth0</dt><dd>${esc(item.auth0Id)}</dd></div>
            <div><dt>E-mail</dt><dd>${esc(item.email)}</dd></div>
            <div><dt>Nome de usuário</dt><dd>@${esc(item.username)}</dd></div>
            <div><dt>Criado em</dt><dd>${when(item.criadoEm)}</dd></div>
            <div><dt>Atualizado em</dt><dd>${when(item.atualizadoEm)}</dd></div>
          </dl>
          <div class="actions-row">
            ${backButton()}
            <button class="btn-accent" type="button" data-action="edit-user" data-id="${esc(item.id)}">Editar perfil</button>
            ${mine ? "" : `<button class="follow ${following ? "is-on" : ""}" type="button" data-action="toggle-follow" data-id="${esc(item.id)}">${following ? "Seguindo" : "Seguir"}</button>`}
            ${mine ? "" : `<button class="btn-danger" type="button" data-action="delete-user" data-id="${esc(item.id)}">Excluir usuário</button>`}
          </div>
        </div>
      </div>
      <div class="section-head"><h2>Seguidores</h2></div>
      ${people(followers, "Ninguém segue este perfil ainda.")}
      <div class="section-head"><h2>Seguindo</h2></div>
      ${people(followingUsers, "Este perfil ainda não segue ninguém.")}
      <div class="section-head"><h2>Favoritos</h2></div>
      ${cards(favorites)}
      <div class="section-head"><h2>Assistidos</h2></div>
      ${cards(watched)}`;
  }

  function renderUserForm(id) {
    const existing = id ? Catalog.getUser(id) : null;
    if (id && !existing.ok) return `${head("Usuário")}<p class="notice" role="alert">${esc(existing.error)}</p>${backButton()}`;
    const base = existing && existing.ok ? existing.user : { auth0Id: "", username: "", email: "", displayName: "", foto: "", bio: "" };
    const values = App.state.formValues || base;
    const errors = App.state.formErrors || {};
    return `${head(id ? "Editar perfil" : "Criar usuário", "Auth0, usuário, e-mail, nome, foto e biografia.")}
      ${notice()}
      <form class="sheet" data-form="user-form" data-id="${esc(id || "")}" novalidate>
        ${field("auth0Id", "Identificador do Auth0", input("auth0Id", values.auth0Id), errors)}
        <div class="split">
          ${field("username", "Nome de usuário", input("username", values.username), errors)}
          ${field("email", "E-mail", input("email", values.email, "email"), errors)}
        </div>
        ${field("displayName", "Nome de exibição", input("displayName", values.displayName), errors)}
        ${field("foto", "Foto de perfil", input("foto", values.foto), errors)}
        ${field("bio", "Biografia", `<textarea name="bio" rows="4">${esc(values.bio || "")}</textarea>`, errors)}
        <div class="actions-row">${backButton()}<button class="btn-accent" type="submit">${id ? "Salvar perfil" : "Criar usuário"}</button></div>
      </form>`;
  }

  function render() {
    const root = document.querySelector("#screen");
    if (!root) return;
    const view = App.state.view || { name: "inicio" };
    const pages = {
      inicio: renderHome,
      explorar: renderExplore,
      lista: renderList,
      filmes: renderMovies,
      series: renderSeries,
      lancamentos: renderReleases,
      generos: renderGenres,
      perfil: () => renderProfile(view.id || Catalog.me().id),
      filme: () => renderMovie(view.id),
      "filme-form": () => renderMovieForm(view.id),
      "usuario-form": () => renderUserForm(view.id),
    };
    root.innerHTML = (pages[view.name] || renderHome)();
  }

  function fail(result, values) {
    App.state.notice = result.error || "";
    App.state.formErrors = result.fields || null;
    App.state.formValues = values || null;
    render();
  }

  function handle(action, el) {
    if (!handled.has(action)) return false;
    const id = el.dataset.id;

    if (action === "back-view") {
      App.back();
      return true;
    }
    if (action === "open-movie") {
      const result = Catalog.getMovie(id);
      if (!result.ok) { App.state.notice = result.error; render(); return true; }
      App.go({ name: "filme", id: result.movie.id });
      return true;
    }
    if (action === "open-user") {
      const result = Catalog.getUser(id);
      if (!result.ok) { App.state.notice = result.error; render(); return true; }
      App.go({ name: "perfil", id: result.user.id });
      return true;
    }
    if (action === "new-movie") { App.go({ name: "filme-form" }); return true; }
    if (action === "edit-movie") { App.go({ name: "filme-form", id }); return true; }
    if (action === "new-user") { App.go({ name: "usuario-form" }); return true; }
    if (action === "edit-user") { App.go({ name: "usuario-form", id }); return true; }
    if (action === "pick-genre") {
      App.state.genre = App.state.genre === el.dataset.genre ? "" : el.dataset.genre;
      render();
      return true;
    }
    if (action === "add-platform") {
      const list = el.closest("form").querySelector(".platform-list");
      list.insertAdjacentHTML("beforeend", platformRows([{ nome: "", url: "" }]));
      return true;
    }
    if (action === "remove-platform") {
      const row = el.closest(".platform-row");
      const list = row.parentElement;
      if (list.children.length === 1) {
        row.querySelectorAll("input").forEach((inputEl) => { inputEl.value = ""; });
      } else row.remove();
      return true;
    }
    if (action === "delete-movie") {
      const result = Catalog.setActive(id, false);
      App.state.notice = result.ok ? "Filme excluído logicamente. O registro continua salvo, fora da lista de ativos." : result.error;
      if (result.ok) App.state.formErrors = null;
      render();
      return true;
    }
    if (action === "restore-movie") {
      const result = Catalog.setActive(id, true);
      App.state.notice = result.ok ? "Filme reativado." : result.error;
      render();
      return true;
    }
    if (action === "toggle-watched" || action === "toggle-favorite") {
      const result = action === "toggle-watched" ? Catalog.toggleWatched(id) : Catalog.toggleFavorite(id);
      App.state.notice = result.ok ? "" : result.error;
      render();
      return true;
    }
    if (action === "toggle-follow") {
      const result = Catalog.toggleFollow(id);
      App.state.notice = result.ok ? "" : result.error;
      render();
      return true;
    }
    if (action === "delete-user") {
      const result = Catalog.deleteUser(id);
      if (!result.ok) { App.state.notice = result.error; render(); return true; }
      App.state.notice = "Usuário excluído.";
      App.back();
      return true;
    }
    return true;
  }

  function submit(form) {
    const kind = form.dataset.form;
    const id = form.dataset.id;

    if (kind === "tmdb-search") {
      const query = form.elements.namedItem("query").value.trim();
      const target = document.querySelector("#tmdb-results");
      if (!query || !target) return;
      target.innerHTML = `<p class="muted">Buscando...</p>`;
      TMDB.searchTitles(query)
        .then((movies) => Promise.all(movies.slice(0, 5).map(async (movie) => ({ movie, videos: await TMDB.getVideos(movie.id, movie.media_type) }))))
        .then((items) => {
          target.innerHTML = items.length ? items.map(({ movie, videos }) => { const title = movie.title || movie.name; const date = movie.release_date || movie.first_air_date; const type = movie.media_type === "tv" ? "Série" : "Filme"; return `<article class="block"><h3>${esc(title)} ${date ? `(${date.slice(0, 4)})` : ""} <small>· ${type}</small></h3><p class="muted">${esc(movie.overview || "Sem sinopse disponível.")}</p>${videos.length ? videos.slice(0, 2).map((video) => `<h4>${esc(video.name)}</h4><iframe width="100%" height="315" src="https://www.youtube.com/embed/${encodeURIComponent(video.key)}" title="${esc(video.name)}" allowfullscreen></iframe>`).join("") : `<p class="muted">Nenhum trailer encontrado.</p>`}</article>`; }).join("") : `<p class="catalog-empty">Nenhum filme ou série encontrado.</p>`;
        })
        .catch((error) => { target.innerHTML = `<p class="notice" role="alert">${esc(error.message)}</p>`; });
      return;
    }

    if (kind === "lookup-movie" || kind === "lookup-user") {
      const value = form.elements.namedItem("id").value.trim();
      if (!value) { App.state.notice = kind === "lookup-movie" ? "Informe o ID do filme." : "Informe o ID do usuário."; render(); return; }
      const result = kind === "lookup-movie" ? Catalog.getMovie(value) : Catalog.getUser(value);
      if (!result.ok) { App.state.notice = result.error; render(); return; }
      App.go(kind === "lookup-movie" ? { name: "filme", id: result.movie.id } : { name: "perfil", id: result.user.id });
      return;
    }

    if (kind === "rating-form") {
      const result = Catalog.updateRating(id, form.avaliacao.value);
      if (!result.ok) { fail(result, { avaliacao: form.avaliacao.value }); return; }
      App.state.notice = "Avaliação atualizada.";
      App.state.formErrors = null;
      App.state.formValues = null;
      render();
      return;
    }

    if (kind === "platforms-form") {
      const plataformas = readPlatforms(form);
      const result = Catalog.updatePlatforms(id, plataformas);
      if (!result.ok) { fail(result, { plataformas }); return; }
      App.state.notice = "Plataformas atualizadas.";
      App.state.formErrors = null;
      App.state.formValues = null;
      render();
      return;
    }

    if (kind === "movie-form") {
      const data = {
        nome: form.nome.value,
        ano: form.ano.value,
        genero: form.genero.value,
        tipo: form.tipo.value,
        sinopse: form.sinopse.value,
        avaliacao: form.avaliacao.value,
        imagem: form.imagem.value,
        plataformas: readPlatforms(form),
      };
      const result = id ? Catalog.updateMovie(id, data) : Catalog.createMovie(data);
      if (!result.ok) { fail(result, data); return; }
      App.state.notice = id ? "Filme atualizado." : "Filme cadastrado.";
      App.state.formErrors = null;
      App.state.formValues = null;
      App.replace({ name: "filme", id: result.movie.id });
      return;
    }

    if (kind === "user-form") {
      const data = {
        auth0Id: form.auth0Id.value,
        username: form.username.value,
        email: form.email.value,
        displayName: form.displayName.value,
        foto: form.foto.value,
        bio: form.bio.value,
      };
      const result = id ? Catalog.updateUser(id, data) : Catalog.createUser(data);
      if (!result.ok) { fail(result, data); return; }
      App.state.notice = id ? "Perfil atualizado." : "Usuário criado.";
      App.state.formErrors = null;
      App.state.formValues = null;
      App.replace({ name: "perfil", id: result.user.id });
    }
  }

  window.Screens = { render, handle, submit };
})();
