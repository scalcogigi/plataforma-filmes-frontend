const state = {
  tab: "para-voce",
  query: "",
  sort: "recentes",
  showAll: false,
  following: new Set(),
  nav: "comunidade",
  view: { name: "comunidade" },
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
    Screens.submit(screenForm);
    return;
  }
  const form = event.target.closest(".composer");
  if (!form) return;
  event.preventDefault();
  const input = form.querySelector("input");
  const text = input.value.trim();
  if (!text) return;

  const card = form.closest(".post-card");
  const item = document.createElement("li");
  item.textContent = `Lucas: ${text}`;
  card.querySelector(".comments").appendChild(item);
  input.value = "";

  const next = Number(card.dataset.comments) + 1;
  card.dataset.comments = String(next);
  card.querySelector("[data-comments]").textContent = next;
  sortPosts();
  showToast("Comentário publicado");
});

document.querySelector("#search").addEventListener("input", (event) => {
  state.query = event.target.value;
  const onForm = ["filme-form", "usuario-form", "filme", "perfil"].includes(state.view.name);
  if (state.nav === "comunidade" && state.view.name === "comunidade") applyFilters();
  else if (!onForm) Screens.render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenus();
});

player.addEventListener("click", (event) => {
  if (event.target === player) player.close();
});

function handleAction(el) {
  const action = el.dataset.action;
  if (window.Screens && Screens.handle(action, el)) return;

  if (action === "tab") {
    state.tab = el.dataset.tab;
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
    if (state.following.has(name)) state.following.delete(name);
    else state.following.add(name);
    const on = state.following.has(name);
    document.querySelectorAll(`[data-follow="${name}"]`).forEach((button) => {
      button.classList.toggle("is-on", on);
      button.textContent = on ? "Seguindo" : "Seguir";
      button.setAttribute("aria-pressed", String(on));
    });
    applyFilters();
    showToast(on ? `Você seguiu ${name}` : `Você deixou de seguir ${name}`);
    return;
  }

  if (action === "like") {
    const card = el.closest(".post-card");
    const on = el.classList.toggle("is-on");
    const likes = Number(card.dataset.baseLikes) + (on ? 1 : 0);
    card.dataset.likes = String(likes);
    el.querySelector("[data-count]").textContent = likes;
    el.setAttribute("aria-pressed", String(on));
    sortPosts();
    return;
  }

  if (action === "save") {
    const on = el.classList.toggle("is-on");
    el.querySelector("[data-label]").textContent = on ? "Salvo" : "Salvar";
    el.setAttribute("aria-pressed", String(on));
    showToast(on ? "Publicação salva" : "Publicação removida dos salvos");
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
    if (state.tab === "para-voce" || state.tab === "criticas") tabOk = card.dataset.feed === "critica";
    else if (state.tab === "noticias") tabOk = card.dataset.feed === "noticia";
    else if (state.tab === "seguindo") tabOk = state.following.has(card.dataset.author);
    const queryOk = !query || card.dataset.search.includes(query);
    card.hidden = !(tabOk && queryOk);
  });

  sortPosts();

  const anyVideo = videos.some((card) => !card.hidden);
  const anyPost = posts.some((card) => !card.hidden);
  document.querySelector("#featured").hidden = !anyVideo;
  document.querySelector("#community").hidden = !anyPost;

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

window.App = { state, go, back, replace };
applyFilters();
