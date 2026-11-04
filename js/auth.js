(function () {
  const publicAuthError = "Não foi possível entrar ou criar sua conta agora. Tente novamente em instantes.";
  let client;
  let currentUser = null;
  let profileReady = false;
  let profileLoad = null;
  let initializationError = null;

  function createGate() {
    const gate = document.createElement("div");

    gate.className = "auth-gate";
    gate.hidden = true;

    gate.innerHTML = `
      <section
        class="auth-card"
        style="position:relative"
        aria-labelledby="auth-title"
      >
        <button type="button" data-auth-close aria-label="Fechar" class="auth-close" style="position:absolute;top:12px;left:14px;right:auto;width:34px;height:34px;min-height:34px;padding:0;border-radius:50%;background:transparent;font-size:26px;line-height:1;z-index:1">×</button>
        <h1 id="auth-title">
          Sua sessão cinematográfica
        </h1>

        <p>
          Entre para organizar sua lista,
          marcar filmes assistidos e participar
          da comunidade.
        </p>

        <button
          type="button"
          data-auth-login
        >
          Entrar ou criar conta
        </button>

        <button type="button" data-auth-retry hidden>Tentar carregar perfil novamente</button>

        <p
          class="auth-error"
          data-auth-error
          hidden
        ></p>
      </section>
    `;

    document.body.appendChild(gate);

    gate
      .querySelector("[data-auth-login]")
      .addEventListener("click", login);
    gate.querySelector("[data-auth-retry]").addEventListener("click", () => loadProfile());
    gate.querySelector("[data-auth-close]").addEventListener("click", () => { gate.hidden = true; });

    return gate;
  }

  const gate = createGate();

  function showError(error) {
    console.warn("Falha no acesso à conta:", error);
    const element =
      gate.querySelector("[data-auth-error]");

    gate.hidden = false;
    const message = error?.message || "";
    element.textContent = error?.status === 401
      ? "Sua sessão não foi aceita pelo serviço. Entre novamente para continuar."
      : error?.status === 403
        ? "O serviço recusou esta ação. Verifique a permissão da conta e a configuração de acesso do site."
        : /Service not found|Callback URL mismatch/.test(message)
          ? "A configuração do login precisa ser corrigida pela equipe do site."
          : currentUser
            ? "Não foi possível carregar seu perfil. Tente novamente ou entre na sua conta outra vez."
            : publicAuthError;
    gate.querySelector("[data-auth-retry]").hidden = !currentUser;

    element.hidden = false;
  }

  async function login() {
    gate.querySelector("[data-auth-error]").hidden = true;
    if (!client) { gate.hidden = false; showError(initializationError || new Error("O login ainda está carregando. Tente novamente em instantes.")); return; }
    try { await client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience:
          window.APP_CONFIG.auth0.audience,
      },

      appState: {
        returnTo: window.location.pathname,
      },
    }); } catch (error) { gate.hidden = false; showError(error); }
  }

  async function logout() {
    if (!client) return;
    try {
      await client.logout({ logoutParams: { returnTo: window.location.origin } });
      currentUser = null;
      profileReady = false;
    } catch (error) { showError(error); }
  }

  function sessionExpired() {
    profileReady = false;
    showError({ status: 401 });
  }

  async function getAccessToken() {
    if (
      !client ||
      !(await client.isAuthenticated())
    ) {
      throw new Error(
        "Faça login para continuar."
      );
    }

    try {
      return await client.getTokenSilently({
        authorizationParams: {
          audience:
            window.APP_CONFIG.auth0.audience,
        },
      });
    } catch (error) {
      console.warn("Falha ao renovar o acesso:", error);
      sessionExpired();
      throw new Error("Não foi possível concluir esta ação. Entre novamente e tente outra vez.");
    }
  }

  function usernameFrom(user) {
    const source =
      user.nickname ||
      (user.email || "usuario").split("@")[0];

    const normalized = source
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._]/g, "_")
      .slice(0, 20);

    return normalized.length >= 3
      ? normalized
      : `user_${normalized}`;
  }

  async function syncProfile(user) {
    let existing = null;
    try { existing = await window.Api.users("/users/me"); } catch (error) { if (error.status !== 404) throw error; }
    if (existing) return existing;
    return window.Api.users(
      "/users/me",
      {
        method: "PUT",

        body: JSON.stringify({
          username: usernameFrom(user),
          email: user.email || "",
          displayName:
            user.name ||
            user.nickname ||
            user.email ||
            "Usuário",
          profileImageUrl:
            user.picture || "",
          bio: "",
        }),
      }
    );
  }

  function updateHeader(user) {
    const name = document.querySelector(
      "[data-auth-name]"
    );

    const avatar = document.querySelector(
      "[data-auth-avatar]"
    );

    if (name) {
      name.textContent =
        user.name ||
        user.nickname ||
        user.email ||
        "Perfil";
    }

    if (avatar) {
      const initial = (
        user.name ||
        user.nickname ||
        user.email ||
        "U"
      )
        .charAt(0)
        .toUpperCase();

      avatar.textContent = initial;

      if (user.picture) {
        const image =
          document.createElement("img");

        image.src = user.picture;
        image.alt = "";

        avatar.appendChild(image);
      }
    }
  }

  async function init() {
    window.Catalog.loadPublic().then(() => { window.Screens?.render(); window.Community?.refreshMovies(); window.Community?.load().catch((error) => console.warn("Comunidade indisponível:", error)); }).catch((error) => { console.warn("Catálogo indisponível:", error); window.Screens?.render(); });
    const config =
      window.APP_CONFIG.auth0;

    if (
      config.clientId.startsWith("COLE_")
    ) {
      throw new Error(
        "Configure o Client ID em js/auth-config.js."
      );
    }

    if (!window.auth0?.createAuth0Client) throw new Error("Biblioteca de login indisponível. Recarregue a página e verifique a conexão.");
    client = await window.auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,

      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: config.audience,
      },

      cacheLocation: "localstorage",
    });

    const params = new URLSearchParams(window.location.search);
    const hasCallback = params.has("state") &&
      (params.has("code") || params.has("error"));

    if (hasCallback) {
      try {
        const result = await client.handleRedirectCallback();
        window.history.replaceState(
          {}, document.title,
          result.appState?.returnTo || window.location.pathname
        );
      } catch (error) {
        const detail = params.get("error_description") || error.message || "Erro desconhecido.";
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        gate.hidden = false;
        showError(new Error(detail));
        return;
      }
    }

    if (
      !(await client.isAuthenticated())
    ) {
      return;
    }

    currentUser = await client.getUser();
    await loadProfile();
  }

  async function loadProfile() {
    if (profileLoad) return profileLoad;
    const button = gate.querySelector("[data-auth-retry]");
    button.disabled = true;
    profileReady = false;
    profileLoad = (async () => {
      try {
        await syncProfile(currentUser);
        await window.Catalog.load();
        profileReady = true;
        document.querySelectorAll("[data-auth-guest]").forEach((el) => { el.hidden = true; });
        document.querySelectorAll("[data-auth-member]").forEach((el) => { el.hidden = false; });
        updateHeader(currentUser);
        gate.hidden = true;
        window.Screens?.render();
        window.Community?.refreshMovies();
        window.App?.syncFollowing();
        // A failure in the public community feed must not invalidate the session.
        window.Community?.load().catch((error) => console.warn("Comunidade indisponível:", error));
      } catch (error) { showError(error); }
      finally { button.disabled = false; }
    })();
    try { await profileLoad; } finally { profileLoad = null; }
  }

  window.Auth = {
    init,
    login,
    logout,
    getAccessToken,
    getUser: () => currentUser,
    isAuthenticated: () => Boolean(currentUser) && profileReady,
    sessionExpired,
    requireLogin: () => { if (currentUser && profileReady) return true; gate.hidden = false; return false; },
  };

  window.addEventListener("DOMContentLoaded", () => init().catch((error) => { initializationError = error; showError(error); }));
})();
