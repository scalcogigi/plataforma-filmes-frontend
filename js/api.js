(function () {
  async function request(baseUrl, path, options = {}) {
    if (!window.Auth) {
      throw new Error(
        "O Auth0 ainda não foi inicializado."
      );
    }

    const token = await window.Auth.getAccessToken();

    const headers = new Headers(
      options.headers || {}
    );

    headers.set(
      "Authorization",
      `Bearer ${token}`
    );

    if (
      options.body &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json; charset=utf-8"
      );
    }

    const response = await fetch(
      `${baseUrl}${path}`,
      {
        ...options,
        headers,
      }
    );

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

      throw new Error(message);
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