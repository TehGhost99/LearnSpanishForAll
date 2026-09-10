/**
 * Appwrite web client for LearnSpanishForAll.
 * Loaded after the Appwrite CDN SDK and assets/appwrite-config.js.
 *
 * On page load we call client.ping() so you can verify the backend connection
 * in the browser console (and in the Practice app status line).
 */
(function () {
  "use strict";

  var cfg = window.APPWRITE_CONFIG;
  if (!cfg || !cfg.endpoint || !cfg.projectId) {
    console.warn("[Appwrite] Config missing — skipping client setup.");
    window.APPWRITE = null;
    return;
  }

  if (typeof Appwrite === "undefined") {
    console.warn("[Appwrite] SDK not loaded — skipping client setup.");
    window.APPWRITE = null;
    return;
  }

  var client = new Appwrite.Client()
    .setEndpoint(cfg.endpoint)
    .setProject(cfg.projectId);

  var account = new Appwrite.Account(client);
  var databases = new Appwrite.Databases(client);

  window.APPWRITE = { client: client, account: account, databases: databases };

  // Verify backend connectivity when the app opens.
  client
    .ping()
    .then(function (result) {
      console.info("[Appwrite] ping OK", result);
      window.APPWRITE_PING = { ok: true, result: result };
      document.dispatchEvent(
        new CustomEvent("appwrite:ping", { detail: { ok: true, result: result } })
      );
    })
    .catch(function (err) {
      console.warn("[Appwrite] ping failed", err);
      window.APPWRITE_PING = { ok: false, error: String(err && err.message ? err.message : err) };
      document.dispatchEvent(
        new CustomEvent("appwrite:ping", {
          detail: { ok: false, error: window.APPWRITE_PING.error }
        })
      );
    });
})();
