(function () {
  let movies = [], users = [], current = null, catalogError = "";
  const movie = (r) => ({ ...r, id: String(r.id), ano: r.lancamento?.slice(0, 4) || "", tipo: r.tipo || "filme", sinopse: r.sinopse || "", imagem: r.imagem || "", plataformas: Object.entries(r.plataformasDisponiveis || {}).map(([nome, url]) => ({ nome, url })), ativo: true, criadoEm: r.lancamento, atualizadoEm: r.lancamento });
  const user = (r) => ({ ...r, auth0Id: r.auth0UserId, foto: r.profileImageUrl, assistidos: r.filmesAssistidosIds || [], favoritos: r.filmesFavoritosIds || [], seguidores: r.seguidoresIds || [], seguindo: r.seguindoIds || [], criadoEm: r.createdAt, atualizadoEm: r.updateAt });
  const normalize = (value) => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase().trim();
  const matches = (m, query) => [m.nome, m.diretor, m.genero].some((value) => normalize(value).includes(normalize(query)));
  const result = (item, key) => item ? { ok: true, [key]: item } : { ok: false, error: "Registro não encontrado." };
  const failure = (e) => ({ ok: false, error: e.message });
  async function load() {
    const [films, people, me] = await Promise.all([Api.movies("/filmes", { public: true }), Api.users("/users"), Api.users("/users/me")]);
    movies = films.map(movie); users = people.map(user); current = user(me);
    users = users.filter((u) => u.id !== current.id); users.push(current); catalogError = "";
  }
  async function loadPublic() {
    try { movies = (await Api.movies("/filmes", { public: true })).map(movie); catalogError = ""; }
    catch (error) { catalogError = error.message; throw error; }
  }
  async function search(query) { const existing = movies.filter((m) => matches(m, query)); if (existing.length) return existing; const rows = await Api.movies(`/catalogo/pesquisar?termo=${encodeURIComponent(query)}`, { public: true }); await loadPublic(); return rows.map(movie); }
  const reviews = {};
  async function loadReviews(id) { reviews[id] = await Api.movies(`/filmes/${id}/avaliacoes`, { public: true }); return reviews[id]; }
  async function saveReview(id, nota, comentario) { await Api.movies(`/filmes/${id}/avaliacoes/me`, { method: "PUT", body: JSON.stringify({ nota: Number(String(nota).replace(",", ".")), comentario }) }); return loadReviews(id); }
  function getReviews(id) { return reviews[id] || []; }
  const me = () => current || { id: "", displayName: "Usuário", favoritos: [], assistidos: [], seguindo: [], seguidores: [] };
  const getMovie = (id) => result(movies.find((m) => m.id === String(id)), "movie");
  const getUser = (id) => result(users.find((u) => u.id === String(id)), "user");
  function listMovies(o = {}) {
    if (o.active === false) return [];
    let rows = movies.filter((m) => (!o.prefix || matches(m, o.prefix)) && (!o.tipo || m.tipo === o.tipo) && (!o.genero || m.genero === o.genero) && (!o.ids || o.ids.includes(m.id)));
    return [...rows].sort(o.sort === "ano" ? (a, b) => b.ano - a.ano : (a, b) => a.nome.localeCompare(b.nome, "pt"));
  }
  const listUsers = (prefix = "") => users.filter((u) => u.displayName?.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()) || u.username?.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()));
  const genres = () => [...new Set(["Ação", "Animação", "Aventura", "Comédia", "Drama", "Fantasia", "Ficção científica", "Mistério", "Romance", "Suspense", "Terror", ...movies.map((m) => m.genero).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "pt"));
  const platforms = (rows) => Object.fromEntries(rows.filter((r) => r.nome && r.url).map((r) => [r.nome, r.url]));
  function movieRequest(d) { return { nome: d.nome, diretor: d.diretor, casting: d.casting.split(",").map((s) => s.trim()).filter(Boolean), lancamento: d.lancamento, classificacaoIndicativa: Number(d.classificacaoIndicativa), duracao: Number(d.duracao), genero: d.genero, avaliacao: Number(String(d.avaliacao).replace(",", ".")), plataformasDisponiveis: platforms(d.plataformas) }; }
  async function saveMovie(id, d) {
    try {
      const row = await Api.movies(id ? `/filmes/${id}` : "/filmes", { method: id ? "PUT" : "POST", body: JSON.stringify(movieRequest(d)) });
      const mapped = movie(row); movies = id ? movies.map((m) => m.id === String(id) ? mapped : m) : [...movies, mapped];
      return result(mapped, "movie");
    } catch (e) { return failure(e); }
  }
  async function updateRating(id, value) {
    try { const row = await Api.movies(`/filmes/${id}/avaliacao`, { method: "PATCH", body: JSON.stringify({ avaliacao: Number(String(value).replace(",", ".")) }) }); movies = movies.map((m) => m.id === String(id) ? movie(row) : m); return result(movie(row), "movie"); }
    catch (e) { return failure(e); }
  }
  async function updatePlatforms(id, rows) {
    try { const row = await Api.movies(`/filmes/${id}/streamings`, { method: "PUT", body: JSON.stringify({ plataformasDisponiveis: platforms(rows) }) }); movies = movies.map((m) => m.id === String(id) ? movie(row) : m); return result(movie(row), "movie"); }
    catch (e) { return failure(e); }
  }
  async function deleteMovie(id) {
    try { await Api.movies(`/filmes/${id}`, { method: "DELETE" }); movies = movies.filter((m) => m.id !== String(id)); return { ok: true }; }
    catch (e) { return failure(e); }
  }
  async function updateUser(id, d) {
    if (!current || id !== current.id) return { ok: false, error: "Você só pode editar seu perfil." };
    try { const row = await Api.users("/users/me", { method: "PUT", body: JSON.stringify({ username: d.username, email: d.email, displayName: d.displayName, profileImageUrl: d.foto, bio: d.bio }) }); current = user(row); users = users.map((u) => u.id === id ? current : u); return result(current, "user"); }
    catch (e) { return failure(e); }
  }
  async function setMovieList(id, list) {
    if (!current) return { ok: false, error: "Carregue seu perfil antes de alterar sua lista." };
    const field = list === "favorites" ? "favoritos" : "assistidos";
    try {
      const row = await Api.users(`/users/me/${list}/${encodeURIComponent(id)}`, {
        method: current[field].includes(String(id)) ? "DELETE" : "PUT",
      });
      current = user(row);
      users = users.map((u) => u.id === current.id ? current : u);
      return result(current, "user");
    } catch (e) { return failure(e); }
  }
  async function deleteUser(id) {
    if (!current || id !== current.id) return { ok: false, error: "Você só pode excluir seu perfil." };
    try { await Api.users("/users/me", { method: "DELETE" }); current = null; users = users.filter((u) => u.id !== id); await Auth.logout(); return { ok: true }; }
    catch (e) { return failure(e); }
  }
  async function toggleFollow(id) {
    if (!current) return { ok: false, error: "Carregue seu perfil antes de seguir alguém." };
    try { const following = current.seguindo.includes(id); await Api.users(`/users/${id}/follow`, { method: following ? "DELETE" : "POST" }); await load(); return { ok: true }; }
    catch (e) { return failure(e); }
  }
  window.Catalog = { load, loadPublic, search, loadReviews, saveReview, getReviews, me, getMovie, getUser, listMovies, listUsers, genres, error: () => catalogError, createMovie: (d) => saveMovie(null, d), updateMovie: saveMovie, updateRating, updatePlatforms, deleteMovie, updateUser, deleteUser, toggleFavorite: (id) => setMovieList(id, "favorites"), toggleWatched: (id) => setMovieList(id, "watched"), toggleFollow, activeCount: () => movies.length, inactiveCount: () => 0 };
})();
