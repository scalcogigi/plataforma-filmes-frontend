(function () {
  const API_KEY = "COLE_SUA_CHAVE_TMDB_AQUI";
  const API_URL = "https://api.themoviedb.org/3";
  async function request(path, params = {}) {
    if (!API_KEY || API_KEY.startsWith("COLE_")) throw new Error("Configure sua chave da TMDB em js/tmdb.js.");
    const query = new URLSearchParams({ api_key: API_KEY, language: "pt-BR", ...params });
    const response = await fetch(`${API_URL}${path}?${query}`);
    if (!response.ok) throw new Error(`TMDB respondeu com erro ${response.status}.`);
    return response.json();
  }
  async function searchTitles(query) {
    const data = await request("/search/multi", { query, include_adult: "false", page: "1" });
    return (data.results || []).filter((item) => item.media_type === "movie" || item.media_type === "tv");
  }
  async function getVideos(id, type = "movie") {
    const data = await request(`/${type === "tv" ? "tv" : "movie"}/${id}/videos`);
    return (data.results || []).filter((video) => video.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(video.type));
  }
  window.TMDB = { searchTitles, getVideos };
})();
