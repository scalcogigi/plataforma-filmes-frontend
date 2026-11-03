(function () {
  async function request(baseUrl, path, options = {}) {
    const token = options.public ? null : await window.Auth.getAccessToken();

    const headers = new Headers(
      options.headers || {}
    );

    if (token) headers.set("Authorization", `Bearer ${token}`);

    if (
      options.body &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json; charset=utf-8"
      );
    }

    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    } catch (error) {
      throw new Error(`Não foi possível conectar ao serviço em ${baseUrl}. Verifique se a API está em execução.`);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType =
      response.headers.get("content-type") || "";

    const body = contentType.includes(
      "application/json"
    )
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        body && typeof body === "object"
          ? body.message ||
            body.mensagem ||
            `Erro HTTP ${response.status}`
          : body ||
            `Erro HTTP ${response.status}`;

      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return body;
  }

  window.Api = {
    users: (path, options) =>
      request(
        window.APP_CONFIG.api.users,
        path,
        options
      ),

    movies: (path, options) =>
      request(
        window.APP_CONFIG.api.movies,
        path,
        options
      ),
  };
})();
