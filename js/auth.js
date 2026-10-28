(function () {
  let client;
  let currentUser = null;

  function createGate() {
    const gate = document.createElement("div");

    gate.className = "auth-gate";

    gate.innerHTML = `
      <section
        class="auth-card"
        aria-labelledby="auth-title"
      >
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

    return gate;
  }

  const gate = createGate();

  function showError(error) {
    const element =
      gate.querySelector("[data-auth-error]");

    element.textContent =
      error.message ||
      "Não foi possível autenticar.";

    element.hidden = false;
  }

  async function login() {
    await client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience:
          window.APP_CONFIG.auth0.audience,
      },

      appState: {
        returnTo: window.location.pathname,
      },
    });
  }

  async function logout() {
    await client.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
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

    return client.getTokenSilently({
      authorizationParams: {
        audience:
          window.APP_CONFIG.auth0.audience,
      },
    });
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
    const config =
      window.APP_CONFIG.auth0;

    if (
      config.clientId.startsWith("COLE_")
    ) {
      throw new Error(
        "Configure o Client ID em js/auth-config.js."
      );
    }

    client = await createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,

      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: config.audience,
      },

      cacheLocation: "localstorage",
    });

    const hasAuthorizationCode =
      window.location.search.includes("code=");

    const hasState =
      window.location.search.includes("state=");

    if (
      hasAuthorizationCode &&
      hasState
    ) {
      const result =
        await client.handleRedirectCallback();

      window.history.replaceState(
        {},
        document.title,
        result.appState?.returnTo ||
          window.location.pathname
      );
    }

    if (
      !(await client.isAuthenticated())
    ) {
      gate.hidden = false;
      return;
    }

    currentUser = await client.getUser();

    updateHeader(currentUser);

    gate.hidden = true;

    try {
      await syncProfile(currentUser);
    } catch (error) {
      console.warn(
        "Login concluído, mas não foi possível sincronizar /users/me:",
        error
      );
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const logoutButton =
        event.target.closest(
          '[data-action="logout"]'
        );

      if (logoutButton) {
        logout();
      }
    }
  );

  window.Auth = {
    init,
    login,
    logout,
    getAccessToken,
    getUser: () => currentUser,
  };

  init().catch(showError);
})();