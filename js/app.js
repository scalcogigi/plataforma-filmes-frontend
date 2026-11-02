const state = {
  tab: "para-voce",
  query: "",
  sort: "recentes",
  showAll: false,
  following: new Set(),
  nav: "inicio",
  view: { name: "inicio" },
  stack: [],
  notice: "",
  formErrors: null,
  formValues: null,
  genre: "",
};

const player = document.querySelector("#player");
const stage = player.querySelector(".player-stage");
const toast = document.querySelector("#toast");
let toastTimer = 0;

document.addEventListener("click", (event) => {
  const actionEl = event.target.closest("[data-action]");
  const opener = event.target.closest("[data-open-menu]");
  const anchor = event.target.closest("[data-menu]");

  if (actionEl) {
    handleAction(actionEl);
    closeMenus();
    return;
  }

  document.querySelectorAll("[data-menu].is-open").forEach((menu) => {
    if (menu !== anchor) closeMenu(menu);
  });

  if (opener && anchor) {
    const open = anchor.classList.toggle("is-open");
    opener.setAttribute("aria-expanded", String(open));
  }
});

document.addEventListener("submit", (event) => {
  const screenForm = event.target.closest("[data-form]");
  if (screenForm) {
    event.preventDefault();
    if (!["tmdb-search", "lookup-movie", "lookup-user"].includes(screenForm.dataset.form) && !Auth.requireLogin()) return;
    if (screenForm.dataset.form === "community-post") {
      const texto = screenForm.elements.namedItem("texto").value.trim();
      const filmeId = screenForm.elements.namedItem("filmeId").value;
      const filme = Catalog.getMovie(filmeId);
      if (!texto || !filme.ok) { showToast("Escolha um filme ou série do catálogo."); return; }
      Community.publish({ texto, filmeId: Number(filmeId), tituloFilme: filme.movie.nome, categoria: "critica" }).then(() => { screenForm.reset(); screenForm.hidden = true; document.querySelector('[data-action="toggle-compose"]').setAttribute("aria-expanded", "false"); showToast("Publicação salva"); }).catch((error) => showToast(error.message));
      return;
    }
    Screens.submit(screenForm);
    return;
  }
  const form = event.target.closest(".composer");
  if (!form) return;
  event.preventDefault();
  if (!Auth.requireLogin()) return;
  const input = form.querySelector("input");
  const text = input.value.trim();
  if (!text) return;
  const card = form.closest(".post-card");
  if (!card.dataset.postId) { showToast("Comunidade indisponível no momento"); return; }
  Community.comment(card.dataset.postId, text).then(() => showToast("Comentário publicado")).catch((error) => showToast(error.message));
});

document.querySelector("#search").addEventListener("input", (event) => {
  state.query = event.target.value;
  const onForm = ["filme-form", "usuario-form", "filme", "perfil"].includes(state.view.name);
  if (state.nav === "comunidade" && state.view.name === "comunidade") applyFilters();
  else if (!onForm) Screens.render();
});
document.querySelector("#search").addEventListener("keydown", async (event) => {
  if (event.key !== "Enter" || state.nav === "comunidade") return;
  event.preventDefault();
  const query = event.target.value.trim();
  if (query.length < 2) return;
  try { const rows = await Catalog.search(query); state.notice = `${rows.length} título(s) encontrado(s).`; Screens.render(); }
  catch (error) { state.notice = error.message; Screens.render(); }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenus();
});

player.addEventListener("click", (event) => {
  if (event.target === player) player.close();
});

function handleAction(el) {
  const action = el.dataset.action;
  if (["new-movie", "edit-movie", "delete-movie", "new-user", "edit-user", "delete-user", "toggle-follow", "toggle-watched", "toggle-favorite", "follow", "like", "save", "comment", "save-video", "social"].includes(action) && !Auth.requireLogin()) return;
  if (action === "login") { Auth.login(); return; }
  if (action === "logout") { Auth.logout(); return; }
  if (action === "toggle-compose") { if (!Auth.requireLogin()) return; const form = document.querySelector('[data-form="community-post"]'); form.hidden = !form.hidden; el.setAttribute("aria-expanded", String(!form.hidden)); if (!form.hidden) Community.refreshMovies(); return; }
  if (action === "toggle-film-search") { const row = document.querySelector(".community-film-search"); row.hidden = !row.hidden; if (!row.hidden) row.querySelector("input").focus(); return; }
  if (action === "community-search") {
    const row = document.querySelector(".community-film-search");
    const query = row.querySelector("input").value.trim();
    if (query.length < 2) { showToast("Digite pelo menos duas letras."); return; }
    el.disabled = true; el.textContent = "Pesquisando...";
    Catalog.search(query).then((items) => { Community.refreshMovies(items[0]?.id); Screens.render(); showToast(items.length ? `${items.length} título(s) encontrados.` : "Nenhum título encontrado."); }).catch((error) => showToast(error.message)).finally(() => { el.disabled = false; el.textContent = "Pesquisar"; });
    return;
  }
  if (action === "nav" && ["lista", "perfil"].includes(el.dataset.nav) && !Auth.requireLogin()) return;
  if (window.Screens?.handles(action)) { Screens.handle(action, el); return; }

  if (action === "tab") {
    state.tab = el.dataset.tab;
    const compose = document.querySelector('[data-form="community-post"]');
    compose.hidden = true;
    document.querySelector('[data-action="toggle-compose"]').setAttribute("aria-expanded", "false");
    document.querySelectorAll(".tab").forEach((tab) => {
      const on = tab === el;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", String(on));
    });
    applyFilters();
    return;
  }

  if (action === "nav") {
    const sidebarBtn = document.querySelector(`.sidebar .nav-btn[data-nav="${el.dataset.nav}"]`);
    showSection(el.dataset.nav, el.dataset.label, sidebarBtn);
    return;
  }

  if (action === "back") {
    const community = document.querySelector('.nav-btn[data-nav="comunidade"]');
    showSection("comunidade", "Comunidade", community);
    return;
  }

  if (action === "follow") {
    const name = el.dataset.follow;
    const profile = Catalog.listUsers().find((user) => user.displayName === name);
    if (!profile) { showToast("Este perfil ilustrativo ainda não tem conta."); return; }
    Catalog.toggleFollow(profile.id).then((result) => {
      if (!result.ok) { showToast(result.error); return; }
      if (state.following.has(name)) state.following.delete(name); else state.following.add(name);
      const on = state.following.has(name);
      document.querySelectorAll(`[data-follow="${name}"]`).forEach((button) => { button.classList.toggle("is-on", on); button.textContent = on ? "Seguindo" : "Seguir"; button.setAttribute("aria-pressed", String(on)); });
      applyFilters(); showToast(on ? `Você seguiu ${name}` : `Você deixou de seguir ${name}`);
    }).catch((error) => showToast(error.message));
    return;
  }

  if (action === "like") {
    const card = el.closest(".post-card");
    if (!card.dataset.postId) { showToast("Comunidade indisponível no momento"); return; }
    Community.toggle(card.dataset.postId, "curtida").catch((error) => showToast(error.message));
    return;
  }

  if (action === "save") {
    const card = el.closest(".post-card");
    if (!card.dataset.postId) { showToast("Comunidade indisponível no momento"); return; }
    Community.toggle(card.dataset.postId, "salvo").then(() => showToast("Lista de salvos atualizada")).catch((error) => showToast(error.message));
    return;
  }

  if (action === "comment") {
    const form = el.closest(".post-card").querySelector(".composer");
    form.hidden = !form.hidden;
    el.classList.toggle("is-on", !form.hidden);
    if (!form.hidden) form.querySelector("input").focus();
    return;
  }

  if (action === "tag" || action === "trend") {
    const input = document.querySelector("#search");
    input.value = el.dataset.value;
    state.query = el.dataset.value;
    state.tab = "para-voce";
    document.querySelectorAll(".tab").forEach((tab) => {
      const on = tab.dataset.tab === "para-voce";
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", String(on));
    });
    const community = document.querySelector('.sidebar .nav-btn[data-nav="comunidade"]');
    showSection("comunidade", "Comunidade", community);
    applyFilters();
    input.focus();
    return;
  }

  if (action === "all-videos") {
    state.showAll = !state.showAll;
    el.classList.toggle("is-open", state.showAll);
    el.querySelector("[data-all-label]").textContent = state.showAll ? "Ver menos" : "Ver tudo";
    applyFilters();
    return;
  }

  if (action === "sort") {
    state.sort = el.dataset.sort;
    document.querySelector("#sort-label").textContent = el.textContent;
    sortPosts();
    return;
  }

  if (action === "play") {
    openPlayer(el.closest(".video-card, .post-card"));
    return;
  }

  if (action === "share") {
    const title = el.closest(".video-card").dataset.title;
    const done = () => showToast("Título copiado");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(title).then(done, done);
    else done();
    return;
  }

  if (action === "save-video") {
    const card = el.closest(".video-card");
    const on = card.classList.toggle("is-saved");
    showToast(on ? "Vídeo salvo na sua lista" : "Vídeo removido da lista");
    return;
  }

  if (action === "close-player") {
    player.close();
    return;
  }

  if (action === "toggle-playback") {
    const paused = stage.classList.toggle("is-paused");
    el.textContent = paused ? "Retomar" : "Pausar";
    return;
  }

  if (action === "toast" || action === "social") {
    showToast(el.dataset.message);
  }
}

function showPanels(isCommunity) {
  document.querySelector("#community-screen").hidden = !isCommunity;
  document.querySelector("#screen").hidden = isCommunity;
}

function showSection(nav, label, button) {
  document.querySelectorAll(".nav-btn").forEach((item) => {
    const on = item === button;
    item.classList.toggle("is-active", on);
    if (on) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  state.nav = nav;
  state.stack = [];
  state.notice = "";
  state.formErrors = null;
  state.formValues = null;
  state.genre = "";
  state.view = nav === "perfil" ? { name: "perfil", id: Catalog.me().id } : { name: nav };
  const isCommunity = nav === "comunidade";
  showPanels(isCommunity);
  if (isCommunity) {
    document.title = "Comunidade";
    applyFilters();
  } else {
    Screens.render();
    window.scrollTo(0, 0);
  }
}

function go(view) {
  state.stack.push(state.view);
  state.view = view;
  state.notice = "";
  state.formErrors = null;
  state.formValues = null;
  showPanels(false);
  Screens.render();
  window.scrollTo(0, 0);
}

function replace(view) {
  if (state.stack.length) state.stack.pop();
  state.view = view;
  state.formErrors = null;
  state.formValues = null;
  showPanels(false);
  Screens.render();
  window.scrollTo(0, 0);
}

function back() {
  state.view = state.stack.pop() || { name: state.nav || "comunidade" };
  state.formErrors = null;
  state.formValues = null;
  const isCommunity = state.view.name === "comunidade";
  showPanels(isCommunity);
  if (isCommunity) {
    document.title = "Comunidade";
    applyFilters();
  } else Screens.render();
  window.scrollTo(0, 0);
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  const videos = [...document.querySelectorAll(".video-card")];
  const posts = [...document.querySelectorAll(".post-card")];

  videos.forEach((card) => {
    const tabOk =
      state.tab === "para-voce" ||
      state.tab === "videos" ||
      (state.tab === "seguindo" && state.following.has(card.dataset.author));
    const queryOk = !query || card.dataset.search.includes(query);
    const extraOk = card.dataset.extra !== "true" || state.showAll || (query && queryOk);
    card.hidden = !(tabOk && queryOk && extraOk);
  });

  posts.forEach((card) => {
    let tabOk = false;
    if (state.tab === "para-voce") tabOk = true;
    else if (state.tab === "criticas") tabOk = card.dataset.feed === "critica";
    else if (state.tab === "noticias") tabOk = card.dataset.feed === "noticia";
    else if (state.tab === "seguindo") tabOk = state.following.has(card.dataset.author);
    const queryOk = !query || card.dataset.search.includes(query);
    card.hidden = !(tabOk && queryOk);
  });

  sortPosts();

  const anyVideo = videos.some((card) => !card.hidden);
  const anyPost = posts.some((card) => !card.hidden);
  document.querySelector("#featured").hidden = !anyVideo;
  document.querySelector("#community").hidden = !anyPost && state.tab === "videos";
  document.querySelector('[data-action="toggle-compose"]').hidden = state.tab === "seguindo" || state.tab === "videos";

  const empty = document.querySelector("#feed-empty");
  empty.hidden = anyVideo || anyPost;
  if (!empty.hidden) {
    if (query) empty.textContent = `Nenhum resultado para “${query}”.`;
    else if (state.tab === "seguindo") {
      empty.textContent = "Você ainda não segue ninguém. Use Seguir na coluna ao lado para montar o seu feed.";
    } else {
      empty.textContent = "Nada por aqui ainda.";
    }
  }
}

function sortPosts() {
  const grid = document.querySelector(".post-grid");
  const cards = [...grid.querySelectorAll(".post-card")];
  const score = {
    recentes: (card) => Number(card.dataset.time),
    curtidos: (card) => -Number(card.dataset.likes),
    comentados: (card) => -Number(card.dataset.comments),
  }[state.sort];
  cards.sort((a, b) => score(a) - score(b));
  cards.forEach((card) => grid.appendChild(card));
}

function openPlayer(card) {
  const image = card.querySelector(".cover, .movie-thumb img");
  player.querySelector("[data-player-title]").textContent = card.dataset.title;
  player.querySelector("[data-player-by]").textContent = card.dataset.author;
  stage.style.backgroundImage = image ? `linear-gradient(rgba(0,0,0,.28), rgba(0,0,0,.28)), url("${image.src}")` : "none";
  stage.classList.remove("is-paused");
  player.querySelector("[data-action='toggle-playback']").textContent = "Pausar";
  if (!player.open) player.showModal();
}

function closeMenu(menu) {
  menu.classList.remove("is-open");
  const opener = menu.querySelector("[data-open-menu]");
  if (opener) opener.setAttribute("aria-expanded", "false");
}

function closeMenus() {
  document.querySelectorAll("[data-menu].is-open").forEach(closeMenu);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2400);
}

window.App = { state, go, back, replace, refreshCommunity: applyFilters, syncFollowing: () => {
  state.following = new Set(Catalog.listUsers().filter((user) => Catalog.me().seguindo.includes(user.id)).map((user) => user.displayName));
  applyFilters();
} };
showPanels(false);
Screens.render();
