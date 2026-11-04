(function () {
  const handled = new Set([
    "open-movie", "open-user", "new-movie", "edit-movie", "delete-movie", "restore-movie",
    "toggle-watched", "toggle-favorite", "new-user", "edit-user", "delete-user", "toggle-follow",
    "retry-catalog", "pick-genre", "back-view", "add-platform", "remove-platform",
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

  function catalogStatus() {
    return Catalog.error() ? `<p class="notice" role="alert">${esc(Catalog.error())} <button type="button" class="btn-ghost" data-action="retry-catalog">Tentar novamente</button></p>` : "";
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
          <small class="score">★ ${score(item.avaliacao)}</small>
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
    return `<p class="filter-line">${kind === "usuario" ? "Nomes que começam com" : "Títulos, diretores ou gêneros contendo"} “${esc(query)}”.</p>`;
  }

  function renderHome() {
    const movies = Catalog.listMovies({ prefix: prefix() }).slice(0, 8);
    return `${head("Início", "Descubra filmes e séries no catálogo.")}
      ${notice()}
      ${catalogStatus()}
      <div class="stat-row">
        <article class="stat"><strong>${Catalog.activeCount()}</strong><span>filmes ativos</span></article>
        <article class="stat"><strong>${Catalog.listMovies({ tipo: "serie" }).length}</strong><span>séries</span></article>
        <article class="stat"><strong>${Catalog.listMovies({ tipo: "filme" }).length}</strong><span>filmes</span></article>
      </div>
      <div class="section-head"><h2>No catálogo</h2></div>
      ${filterLine("filme")}
      ${cards(movies)}`;
  }

  function renderExplore() {
    return `${head("Explorar", "Pesquise filmes e séries pelo título. Os resultados passam a fazer parte do catálogo.")}
      ${notice()}
      ${catalogStatus()}
      <form class="inline-form" data-form="movie-search"><input name="query" type="search" placeholder="Ex.: Homem de Ferro" required><button class="btn-accent" type="submit">Pesquisar</button></form>
      <div id="movie-search-results" aria-live="polite"></div>
      ${filterLine("filme")}
      <div class="section-head"><h2>Filmes e séries</h2></div>
      ${cards(Catalog.listMovies({ prefix: prefix() }))}
      `;
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
    return `${head("Filmes", "Filmes disponíveis no catálogo.")}
      <section class="block"><h2>Pesquisar filmes</h2><p class="muted">Encontre um título no catálogo ou descubra um novo.</p>
        <form class="inline-form" data-form="movie-search"><input name="query" type="search" placeholder="Ex.: Interestelar ou The Last of Us" required><button class="btn-accent" type="submit">Buscar</button></form>
        <div id="movie-search-results" aria-live="polite"></div>
      </section>
      ${notice()}
      ${catalogStatus()}
      ${filterLine("filme")}
      ${cards(Catalog.listMovies({ prefix: prefix(), tipo: "filme" }))}
      `;
  }

  function renderSeries() {
    return `${head("Séries", "Séries disponíveis no catálogo.")}
      ${notice()}${catalogStatus()}${filterLine("filme")}
      ${cards(Catalog.listMovies({ prefix: prefix(), tipo: "serie" }), "Nenhuma série cadastrada.")}`;
  }

  function renderReleases() {
    return `${head("Lançamentos", "Ativos ordenados do ano mais recente para o mais antigo.")}
      ${notice()}${catalogStatus()}${filterLine("filme")}
      ${cards(Catalog.listMovies({ prefix: prefix(), sort: "ano" }))}`;
  }

  function renderGenres() {
    const selected = App.state.genre;
    const chips = Catalog.genres().map((genre) => `
      <button class="chip ${genre === selected ? "is-on" : ""}" type="button" data-action="pick-genre" data-genre="${esc(genre)}">${esc(genre)}</button>`).join("");
    return `${head("Gêneros", "Escolha um gênero para filtrar os títulos ativos.")}
      ${notice()}
      ${catalogStatus()}
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
          <p class="detail-score">★ ${score(item.avaliacao)} <small>TMDB</small></p>
          <p class="detail-text">${esc(item.sinopse || "Sinopse indisponível.")}</p>
          ${(item.trailerUrls?.length ? item.trailerUrls : item.trailerUrl ? [item.trailerUrl] : []).map((url, index) => `<a class="platform-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Assistir trailer ${index + 1}</a>`).join(" ")}
          <div class="actions-row">
            ${backButton()}
            <button type="button" class="btn-ghost" data-action="toggle-favorite" data-id="${esc(item.id)}" aria-pressed="${favorite}">${favorite ? "Remover dos favoritos" : "Favoritar"}</button>
            <button type="button" class="btn-ghost" data-action="toggle-watched" data-id="${esc(item.id)}" aria-pressed="${watched}">${watched ? "Desmarcar assistido" : "Marcar como assistido"}</button>
          </div>
          <section class="block">
            <h2>Avaliações da comunidade</h2>
            <form class="sheet" data-form="review-form" data-id="${esc(item.id)}">
              <label class="field">Sua nota (0 a 10)<input name="nota" type="number" min="0" max="10" step="0.1" required></label>
              <label class="field">Seu comentário<textarea name="comentario" rows="3" maxlength="2000"></textarea></label>
              <button class="btn-accent" type="submit">Publicar avaliação</button>
            </form>
            <div class="people">${Catalog.getReviews(item.id).map((review) => `<article class="person"><strong>${esc(review.usuarioId === Auth.getUser()?.sub ? "Você" : "Membro da comunidade")}</strong><span>★ ${score(review.nota)} · ${esc(review.comentario || "Sem comentário.")}</span></article>`).join("") || `<p class="muted">Ainda não há avaliações.</p>`}</div>
          </section>
          <section class="block">
            <h2>Plataformas</h2>
            <div class="platform-links">${links}</div>
          </section>
        </div>
      </div>`;
  }

  function renderMovieForm(id) {
    const existing = id ? Catalog.getMovie(id) : null;
    if (id && !existing.ok) return `${head("Filme")}<p class="notice" role="alert">${esc(existing.error)}</p>${backButton()}`;
    const base = existing && existing.ok ? existing.movie : { nome: "", diretor: "", casting: [], lancamento: "", classificacaoIndicativa: 0, duracao: "", genero: "", avaliacao: "", plataformas: [{ nome: "", url: "" }] };
    const values = App.state.formValues || base;
    const errors = App.state.formErrors || {};
    return `${head(id ? "Editar filme" : "Cadastrar filme", "Todos os dados do filme são validados antes de salvar.")}
      ${notice()}
      <form class="sheet" data-form="movie-form" data-id="${esc(id || "")}" novalidate>
        ${field("nome", "Nome", input("nome", values.nome), errors)}
        <div class="split">${field("diretor", "Diretor", input("diretor", values.diretor), errors)}${field("casting", "Elenco (separado por vírgulas)", input("casting", Array.isArray(values.casting) ? values.casting.join(", ") : values.casting), errors)}</div>
        <div class="split">${field("lancamento", "Lançamento", input("lancamento", values.lancamento, "date"), errors)}${field("genero", "Gênero", input("genero", values.genero), errors)}</div>
        <div class="split">${field("duracao", "Duração em minutos", input("duracao", values.duracao, "number"), errors)}${field("classificacaoIndicativa", "Classificação indicativa", input("classificacaoIndicativa", values.classificacaoIndicativa, "number"), errors)}</div>
        ${field("avaliacao", "Avaliação (0 a 10)", input("avaliacao", values.avaliacao), errors)}
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
            ${mine ? `<div><dt>E-mail</dt><dd>${esc(item.email)}</dd></div>` : ""}
            <div><dt>Nome de usuário</dt><dd>@${esc(item.username)}</dd></div>
            <div><dt>Criado em</dt><dd>${when(item.criadoEm)}</dd></div>
            <div><dt>Atualizado em</dt><dd>${when(item.atualizadoEm)}</dd></div>
          </dl>
          <div class="actions-row">
            ${backButton()}
            ${mine ? `<button class="btn-accent" type="button" data-action="edit-user" data-id="${esc(item.id)}">Editar perfil</button>` : ""}
            ${mine ? "" : `<button class="follow ${following ? "is-on" : ""}" type="button" data-action="toggle-follow" data-id="${esc(item.id)}">${following ? "Seguindo" : "Seguir"}</button>`}
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
    return `${head("Editar meu perfil", "Atualize os dados do seu perfil.")}
      ${notice()}
      <form class="sheet" data-form="user-form" data-id="${esc(id || "")}" novalidate>
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

  async function handle(action, el) {
    if (!handled.has(action)) return false;
    const id = el.dataset.id;

    if (action === "retry-catalog") {
      el.disabled = true;
      try { await Catalog.loadPublic(); } catch { /* Catalog.error supplies the visible message. */ }
      render();
      return true;
    }
    if (action === "toggle-favorite" || action === "toggle-watched") {
      el.disabled = true;
      try {
        const result = await (action === "toggle-favorite" ? Catalog.toggleFavorite(id) : Catalog.toggleWatched(id));
        App.state.notice = result.ok ? "Lista atualizada." : result.error;
        render();
      } finally { el.disabled = false; }
      return true;
    }
    if (action === "back-view") {
      App.back();
      return true;
    }
    if (action === "open-movie") {
      const result = Catalog.getMovie(id);
      if (!result.ok) { App.state.notice = result.error; render(); return true; }
      App.go({ name: "filme", id: result.movie.id });
      try { await Catalog.loadReviews(id); render(); } catch (error) { App.state.notice = error.message; render(); }
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
      const result = await Catalog.deleteMovie(id);
      App.state.notice = result.ok ? "Filme excluído do catálogo." : result.error;
      if (result.ok) App.state.formErrors = null;
      render();
      return true;
    }
    if (action === "toggle-follow") {
      const result = await Catalog.toggleFollow(id);
      App.state.notice = result.ok ? "" : result.error;
      render();
      return true;
    }
    if (action === "delete-user") {
      const result = await Catalog.deleteUser(id);
      if (!result.ok) { App.state.notice = result.error; render(); return true; }
      App.state.notice = "Usuário excluído.";
      App.back();
      return true;
    }
    return true;
  }

  async function submit(form) {
    const kind = form.dataset.form;
    const id = form.dataset.id;

    if (kind === "movie-search") {
      const query = form.elements.namedItem("query").value.trim();
      const target = document.querySelector("#movie-search-results");
      if (!query || !target) return;
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      target.innerHTML = `<p class="muted" role="status">Pesquisando filmes e séries...</p>`;
      try {
        const rows = await Catalog.search(query);
        render();
        const refreshedForm = document.querySelector('[data-form="movie-search"]');
        if (refreshedForm) refreshedForm.elements.namedItem("query").value = query;
        const refreshedResults = document.querySelector("#movie-search-results");
        if (refreshedResults) refreshedResults.innerHTML = cards(rows);
      } catch (error) {
        target.innerHTML = `<p class="notice" role="alert">${esc(error.message)}</p>`;
      } finally {
        button.disabled = false;
      }
      return;
    }

    if (kind === "review-form") {
      try { await Catalog.saveReview(id, form.nota.value, form.comentario.value); App.state.notice = "Avaliação publicada."; render(); }
      catch (error) { App.state.notice = error.message; render(); }
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
      const result = await Catalog.updateRating(id, form.avaliacao.value);
      if (!result.ok) { fail(result, { avaliacao: form.avaliacao.value }); return; }
      App.state.notice = "Avaliação atualizada.";
      App.state.formErrors = null;
      App.state.formValues = null;
      render();
      return;
    }

    if (kind === "platforms-form") {
      const plataformas = readPlatforms(form);
      const result = await Catalog.updatePlatforms(id, plataformas);
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
        diretor: form.diretor.value,
        casting: form.casting.value,
        lancamento: form.lancamento.value,
        duracao: form.duracao.value,
        classificacaoIndicativa: form.classificacaoIndicativa.value,
        genero: form.genero.value,
        avaliacao: form.avaliacao.value,
        plataformas: readPlatforms(form),
      };
      const result = await (id ? Catalog.updateMovie(id, data) : Catalog.createMovie(data));
      if (!result.ok) { fail(result, data); return; }
      App.state.notice = id ? "Filme atualizado." : "Filme cadastrado.";
      App.state.formErrors = null;
      App.state.formValues = null;
      App.replace({ name: "filme", id: result.movie.id });
      return;
    }

    if (kind === "user-form") {
      const data = {
        username: form.username.value,
        email: form.email.value,
        displayName: form.displayName.value,
        foto: form.foto.value,
        bio: form.bio.value,
      };
      const result = await Catalog.updateUser(id, data);
      if (!result.ok) { fail(result, data); return; }
      App.state.notice = id ? "Perfil atualizado." : "Usuário criado.";
      App.state.formErrors = null;
      App.state.formValues = null;
      App.replace({ name: "perfil", id: result.user.id });
    }
  }

  window.Screens = { render, handle, submit, handles: (action) => handled.has(action) };
})();
