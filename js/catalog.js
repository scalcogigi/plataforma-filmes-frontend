(function () {
  const KEY = "visualbox.v1";

  const seed = {
    version: 1,
    currentUserId: "u1",
    nextMovie: 9,
    nextUser: 5,
    movies: [
      movie("1", "Duna", 2021, "Ficção científica", "filme", "Depois da queda da casa dos Atréides, Paul aprende a sobreviver no deserto de Arrakis.", 8, "assets/dune.jpg", [{ nome: "Max", url: "https://www.max.com/" }]),
      movie("2", "Oppenheimer", 2023, "Drama", "filme", "A corrida para construir a bomba atômica e o peso que fica depois do teste.", 8.9, "assets/fire.jpg", [{ nome: "Prime Video", url: "https://www.primevideo.com/" }]),
      movie("3", "Interestelar", 2014, "Ficção científica", "filme", "Um grupo atravessa um buraco de minhoca em busca de um novo lar para a humanidade.", 8.7, "assets/astro.jpg", [{ nome: "Prime Video", url: "https://www.primevideo.com/" }, { nome: "Netflix", url: "https://www.netflix.com/" }]),
      movie("4", "The Last of Us", 2023, "Drama", "serie", "Joel e Ellie cruzam um país destruído por uma infecção, e a viagem muda os dois.", 8.7, "assets/forest.jpg", [{ nome: "Max", url: "https://www.max.com/" }]),
      movie("5", "Divertida Mente 2", 2024, "Animação", "filme", "Novas emoções chegam à mente de Riley quando a adolescência começa.", 7.6, "assets/joy.jpg", [{ nome: "Disney+", url: "https://www.disneyplus.com/" }]),
      movie("6", "Godzilla e Kong", 2024, "Ação", "filme", "Os dois titãs precisam dividir a luta contra uma ameaça ainda maior.", 6.8, "assets/city.jpg", [{ nome: "Max", url: "https://www.max.com/" }]),
      movie("7", "Tudo em Todo Lugar ao Mesmo Tempo", 2022, "Ação", "filme", "Uma mulher comum descobre que pode saltar entre versões da própria vida.", 7.6, "assets/color.jpg", [{ nome: "Netflix", url: "https://www.netflix.com/" }]),
      movie("8", "Coringa", 2019, "Drama", "filme", "Um comediante ignorado pela cidade vai se transformando em outra pessoa.", 8.4, "assets/suit.jpg", [{ nome: "Max", url: "https://www.max.com/" }]),
    ],
    users: [
      user("u1", "auth0|lucas", "lucas", "lucas@visual.box", "Lucas", "assets/lucas.jpg", "Recomendações diretas, sem estragar o final.", ["1", "2", "4"], ["2", "8"], ["u2", "u3"], ["u2"], "2025-11-02T15:00:00.000Z"),
      user("u2", "auth0|marina", "marina", "marina@visual.box", "Marina", "assets/marina.jpg", "Análises e teorias sobre o que a imagem esconde.", ["1", "3"], ["1", "3"], ["u1", "u4"], ["u1"], "2025-12-14T18:30:00.000Z"),
      user("u3", "auth0|rafael", "rafael", "rafael@visual.box", "Rafael", "assets/rafael.jpg", "Curiosidades e bastidores de filmagem.", ["2", "8"], ["2"], ["u1"], [], "2026-01-20T11:10:00.000Z"),
      user("u4", "auth0|beatriz", "beatriz", "beatriz@visual.box", "Beatriz", "assets/beatriz.jpg", "Críticas e recomendações para ver no fim de semana.", ["4", "7"], ["7", "4"], [], ["u2"], "2026-02-08T09:40:00.000Z"),
    ],
  };

  function movie(id, nome, ano, genero, tipo, sinopse, avaliacao, imagem, plataformas) {
    return { id, nome, ano, genero, tipo, sinopse, avaliacao, imagem, plataformas, ativo: true, criadoEm: "2026-03-01T12:00:00.000Z", atualizadoEm: "2026-08-12T12:00:00.000Z" };
  }

  function user(id, auth0Id, username, email, displayName, foto, bio, assistidos, favoritos, seguidores, seguindo, criadoEm) {
    return { id, auth0Id, username, email, displayName, foto, bio, assistidos, favoritos, seguidores, seguindo, criadoEm, atualizadoEm: "2026-09-01T12:00:00.000Z" };
  }

  const saved = load();
  const store = saved || structuredClone(seed);

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.movies) || !Array.isArray(data.users)) return null;
      return data;
    } catch {
      return null;
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* a tela segue funcionando nesta sessão */ }
  }

  function norm(value) {
    return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function validImage(value) {
    if (!value) return true;
    if (value.startsWith("assets/") && !value.includes("..")) return true;
    return isHttpUrl(value);
  }

  function me() {
    return store.users.find((item) => item.id === store.currentUserId) || store.users[0];
  }

  function getMovie(id) {
    const movieItem = store.movies.find((item) => norm(item.id) === norm(id));
    if (!movieItem) return { ok: false, error: "Filme inexistente." };
    return { ok: true, movie: movieItem };
  }

  function getUser(id) {
    const userItem = store.users.find((item) => norm(item.id) === norm(id));
    if (!userItem) return { ok: false, error: "Usuário inexistente." };
    return { ok: true, user: userItem };
  }

  function listMovies(options = {}) {
    const active = options.active !== false;
    let items = store.movies.filter((item) => item.ativo === active);
    if (options.prefix) {
      const query = norm(options.prefix);
      items = items.filter((item) => norm(item.nome).startsWith(query));
    }
    if (options.tipo) items = items.filter((item) => item.tipo === options.tipo);
    if (options.genero) items = items.filter((item) => item.genero === options.genero);
    if (options.ids) items = items.filter((item) => options.ids.includes(item.id));
    if (options.sort === "ano") items.sort((a, b) => b.ano - a.ano || a.nome.localeCompare(b.nome, "pt"));
    else items.sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
    return items;
  }

  function genres() {
    return [...new Set(store.movies.filter((item) => item.ativo).map((item) => item.genero))].sort((a, b) => a.localeCompare(b, "pt"));
  }

  function listUsers(prefix) {
    let items = [...store.users];
    if (prefix) {
      const query = norm(prefix);
      items = items.filter((item) => norm(item.displayName).startsWith(query) || norm(item.username).startsWith(query));
    }
    return items.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt"));
  }

  function cleanPlatforms(rows) {
    const fields = {};
    const plataformas = [];
    (rows || []).forEach((row, index) => {
      const nome = String(row.nome || "").trim();
      const url = String(row.url || "").trim();
      if (!nome && !url) return;
      if (!nome) fields[`plataforma-${index}`] = "Informe o nome da plataforma.";
      if (!url) fields[`plataforma-url-${index}`] = "Informe a URL da plataforma.";
      else if (!isHttpUrl(url)) fields[`plataforma-url-${index}`] = "A URL precisa começar com http:// ou https://.";
      plataformas.push({ nome, url });
    });
    return { plataformas, fields };
  }

  function validateMovie(data, id) {
    const fields = {};
    const nome = String(data.nome || "").trim();
    const genero = String(data.genero || "").trim();
    const sinopse = String(data.sinopse || "").trim();
    const tipo = data.tipo === "serie" ? "serie" : data.tipo === "filme" ? "filme" : "";
    const ano = Number(String(data.ano || "").replace(",", "."));
    const avaliacao = Number(String(data.avaliacao ?? "").replace(",", "."));
    const imagem = String(data.imagem || "").trim();

    if (nome.length < 2) fields.nome = "O nome precisa ter pelo menos 2 caracteres.";
    if (!Number.isInteger(ano) || ano < 1888 || ano > 2028) fields.ano = "Informe um ano entre 1888 e 2028.";
    if (!genero) fields.genero = "Informe o gênero.";
    if (sinopse.length < 10) fields.sinopse = "A sinopse precisa ter pelo menos 10 caracteres.";
    if (!tipo) fields.tipo = "Escolha filme ou série.";
    if (!Number.isFinite(avaliacao) || avaliacao < 0 || avaliacao > 10) fields.avaliacao = "A avaliação precisa ser um número de 0 a 10.";
    if (!validImage(imagem)) fields.imagem = "Use um caminho em assets/ ou uma URL http(s).";

    const platforms = cleanPlatforms(data.plataformas);
    Object.assign(fields, platforms.fields);

    if (id && !store.movies.some((item) => item.id === id)) return { ok: false, error: "Filme inexistente.", fields };
    if (Object.keys(fields).length) return { ok: false, error: "Revise os campos destacados.", fields };

    return {
      ok: true,
      value: { nome, ano, genero, tipo, sinopse, avaliacao: Math.round(avaliacao * 10) / 10, imagem, plataformas: platforms.plataformas },
    };
  }

  function createMovie(data) {
    const result = validateMovie(data);
    if (!result.ok) return result;
    const now = new Date().toISOString();
    const created = { id: String(store.nextMovie++), ...result.value, ativo: true, criadoEm: now, atualizadoEm: now };
    store.movies.push(created);
    save();
    return { ok: true, movie: created };
  }

  function updateMovie(id, data) {
    const current = store.movies.find((item) => item.id === id);
    if (!current) return { ok: false, error: "Filme inexistente." };
    const result = validateMovie(data, id);
    if (!result.ok) return result;
    Object.assign(current, result.value, { atualizadoEm: new Date().toISOString() });
    save();
    return { ok: true, movie: current };
  }

  function updateRating(id, raw) {
    const current = store.movies.find((item) => item.id === id);
    if (!current) return { ok: false, error: "Filme inexistente." };
    const avaliacao = Number(String(raw ?? "").replace(",", "."));
    if (!Number.isFinite(avaliacao) || avaliacao < 0 || avaliacao > 10) {
      return { ok: false, error: "A avaliação precisa ser um número de 0 a 10.", fields: { avaliacao: "Use um valor de 0 a 10." } };
    }
    current.avaliacao = Math.round(avaliacao * 10) / 10;
    current.atualizadoEm = new Date().toISOString();
    save();
    return { ok: true, movie: current };
  }

  function updatePlatforms(id, rows) {
    const current = store.movies.find((item) => item.id === id);
    if (!current) return { ok: false, error: "Filme inexistente." };
    const platforms = cleanPlatforms(rows);
    if (Object.keys(platforms.fields).length) {
      return { ok: false, error: "Revise as URLs das plataformas.", fields: platforms.fields };
    }
    current.plataformas = platforms.plataformas;
    current.atualizadoEm = new Date().toISOString();
    save();
    return { ok: true, movie: current };
  }

  function setActive(id, ativo) {
    const current = store.movies.find((item) => item.id === id);
    if (!current) return { ok: false, error: "Filme inexistente." };
    current.ativo = ativo;
    current.atualizadoEm = new Date().toISOString();
    save();
    return { ok: true, movie: current };
  }

  function validateUser(data, id) {
    const fields = {};
    const auth0Id = String(data.auth0Id || "").trim();
    const username = String(data.username || "").trim();
    const email = String(data.email || "").trim();
    const displayName = String(data.displayName || "").trim();
    const foto = String(data.foto || "").trim();
    const bio = String(data.bio || "").trim();

    if (auth0Id.length < 3) fields.auth0Id = "Informe o identificador do Auth0.";
    if (!/^[a-z0-9._]{3,20}$/i.test(username)) fields.username = "Use de 3 a 20 letras, números, ponto ou _.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Informe um e-mail válido.";
    if (displayName.length < 2) fields.displayName = "O nome de exibição precisa ter pelo menos 2 caracteres.";
    if (bio.length > 280) fields.bio = "A biografia pode ter no máximo 280 caracteres.";
    if (!validImage(foto)) fields.foto = "Use um caminho em assets/ ou uma URL http(s).";

    const usernameTaken = store.users.some((item) => item.id !== id && norm(item.username) === norm(username));
    const authTaken = store.users.some((item) => item.id !== id && norm(item.auth0Id) === norm(auth0Id));
    const emailTaken = store.users.some((item) => item.id !== id && norm(item.email) === norm(email));
    if (usernameTaken) fields.username = "Esse nome de usuário já está em uso.";
    if (authTaken) fields.auth0Id = "Esse identificador do Auth0 já está em uso.";
    if (emailTaken) fields.email = "Esse e-mail já está em uso.";
    if (id && !store.users.some((item) => item.id === id)) return { ok: false, error: "Usuário inexistente.", fields };

    if (Object.keys(fields).length) return { ok: false, error: "Revise os campos destacados.", fields };
    return { ok: true, value: { auth0Id, username, email, displayName, foto, bio } };
  }

  function createUser(data) {
    const result = validateUser(data);
    if (!result.ok) return result;
    const now = new Date().toISOString();
    const created = { id: `u${store.nextUser++}`, ...result.value, assistidos: [], favoritos: [], seguidores: [], seguindo: [], criadoEm: now, atualizadoEm: now };
    store.users.push(created);
    save();
    return { ok: true, user: created };
  }

  function updateUser(id, data) {
    const current = store.users.find((item) => item.id === id);
    if (!current) return { ok: false, error: "Usuário inexistente." };
    const result = validateUser(data, id);
    if (!result.ok) return result;
    Object.assign(current, result.value, { atualizadoEm: new Date().toISOString() });
    save();
    return { ok: true, user: current };
  }

  function deleteUser(id) {
    const current = store.users.find((item) => item.id === id);
    if (!current) return { ok: false, error: "Usuário inexistente." };
    if (current.id === store.currentUserId) return { ok: false, error: "O usuário da sessão não pode ser excluído." };
    store.users = store.users.filter((item) => item.id !== id);
    store.users.forEach((item) => {
      item.seguidores = item.seguidores.filter((entry) => entry !== id);
      item.seguindo = item.seguindo.filter((entry) => entry !== id);
    });
    save();
    return { ok: true };
  }

  function toggleFollow(id) {
    const current = me();
    const other = store.users.find((item) => item.id === id);
    if (!other) return { ok: false, error: "Usuário inexistente." };
    if (other.id === current.id) return { ok: false, error: "Você não pode seguir a si mesmo." };
    const already = current.seguindo.includes(other.id);
    if (already) {
      current.seguindo = current.seguindo.filter((entry) => entry !== other.id);
      other.seguidores = other.seguidores.filter((entry) => entry !== current.id);
    } else {
      current.seguindo.push(other.id);
      other.seguidores.push(current.id);
    }
    const now = new Date().toISOString();
    current.atualizadoEm = now;
    other.atualizadoEm = now;
    save();
    return { ok: true, following: !already };
  }

  function toggleList(id, key) {
    const result = getMovie(id);
    if (!result.ok) return result;
    const current = me();
    const has = current[key].includes(result.movie.id);
    current[key] = has ? current[key].filter((entry) => entry !== result.movie.id) : [...current[key], result.movie.id];
    current.atualizadoEm = new Date().toISOString();
    save();
    return { ok: true, on: !has };
  }

  window.Catalog = {
    me,
    getMovie,
    getUser,
    listMovies,
    listUsers,
    genres,
    createMovie,
    updateMovie,
    updateRating,
    updatePlatforms,
    setActive,
    createUser,
    updateUser,
    deleteUser,
    toggleFollow,
    toggleWatched: (id) => toggleList(id, "assistidos"),
    toggleFavorite: (id) => toggleList(id, "favoritos"),
    inactiveCount: () => store.movies.filter((item) => !item.ativo).length,
    activeCount: () => store.movies.filter((item) => item.ativo).length,
  };
})();
