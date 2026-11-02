(function () {
  const grid = document.querySelector("#community .post-grid");
  const fallback = grid.innerHTML;
  let ready = false;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const age = (time) => { const hours = Math.max(1, Math.floor((Date.now() - Date.parse(time)) / 3600000)); return hours < 24 ? `há ${hours} h` : `há ${Math.floor(hours / 24)} d`; };
  function card(post) {
    const film = Catalog.listMovies().find((m) => m.id === String(post.filmeId) || m.nome.toLocaleLowerCase() === post.tituloFilme?.toLocaleLowerCase());
    const image = film?.imagem ? `<img src="${esc(film.imagem)}" alt="">` : "";
    const movieRef = post.tituloFilme ? `<div class="movie-ref"><div class="movie-thumb">${image}</div><div><strong>${esc(post.tituloFilme)}</strong><p>${esc(film ? `${film.ano} · ${film.genero}` : "Filme ou série")}</p></div></div>` : "";
    const comments = post.comentarios.map((c) => `<li><strong>${esc(c.autor)}:</strong> ${esc(c.texto)}</li>`).join("");
    const author = post.autor || "Membro";
    const avatar = { Marina: "assets/marina.jpg", Rafael: "assets/rafael.jpg", Beatriz: "assets/beatriz.jpg", Lucas: "assets/lucas.jpg" }[author];
    return `<article class="post-card" data-post-id="${post.id}" data-feed="${esc(post.categoria)}" data-author="${esc(author)}" data-title="${esc(post.tituloFilme || "")}" data-time="${Math.max(0, Math.floor((Date.now() - Date.parse(post.criadoEm)) / 3600000))}" data-likes="${post.curtidas}" data-base-likes="${post.curtidas}" data-comments="${post.comentarios.length}" data-search="${esc(`${author} ${post.tituloFilme || ""} ${post.texto}`.toLocaleLowerCase())}">
      <div class="post-top"><span class="avatar neutral">${esc(author.slice(0, 1).toUpperCase())}${avatar ? `<img src="${avatar}" alt="">` : ""}</span><strong>${esc(author)}</strong><span class="time">${age(post.criadoEm)}</span></div>
      <p class="post-text">${esc(post.texto)}</p>${movieRef}
      <div class="post-actions">
        <button class="action" type="button" data-action="like" aria-pressed="false">♡ Curtir <span data-count>${post.curtidas}</span></button>
        <button class="action" type="button" data-action="comment">◯ Comentar <span data-comments>${post.comentarios.length}</span></button>
        <button class="action" type="button" data-action="save" aria-pressed="false">♧ <span data-label>Salvar</span></button>
      </div>
      <form class="composer" hidden><input type="text" maxlength="2000" placeholder="Escreva um comentário" aria-label="Escreva um comentário" required><button class="btn-accent" type="submit">Publicar</button></form>
      <ul class="comments">${comments}</ul>
    </article>`;
  }
  async function load() {
    const posts = await Api.movies("/comunidade/publicacoes", { public: true });
    grid.innerHTML = posts.map(card).join("");
    ready = true;
    window.App?.refreshCommunity();
  }
  async function publish(data) { await Api.movies("/comunidade/publicacoes", { method: "POST", body: JSON.stringify(data) }); await load(); }
  async function comment(id, texto) { await Api.movies(`/comunidade/publicacoes/${id}/comentarios`, { method: "POST", body: JSON.stringify({ texto }) }); await load(); }
  async function toggle(id, tipo) { await Api.movies(`/comunidade/publicacoes/${id}/${tipo}`, { method: "PUT" }); await load(); }
  function refreshMovies(selectedId) {
    const select = document.querySelector('[data-form="community-post"] [name="filmeId"]');
    const previous = selectedId || select.value;
    select.innerHTML = '<option value="">Escolha um título do catálogo</option>' + Catalog.listMovies().map((m) => `<option value="${esc(m.id)}">${esc(m.nome)} (${esc(m.ano)}) · ${m.tipo === "serie" ? "Série" : "Filme"}</option>`).join("");
    if (previous) select.value = previous;
  }
  window.Community = { load, publish, comment, toggle, refreshMovies, isReady: () => ready, showFallback: () => { grid.innerHTML = fallback; ready = false; } };
  window.addEventListener("DOMContentLoaded", () => load().catch((error) => console.warn("Comunidade indisponível:", error)));
})();
