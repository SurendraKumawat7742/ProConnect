self.__BUILD_MANIFEST = {
  "/": [
    "static/chunks/pages/index.js"
  ],
  "/dashboard": [
    "static/chunks/pages/dashboard.js"
  ],
  "/discover": [
    "static/chunks/pages/discover.js"
  ],
  "/login": [
    "static/chunks/pages/login.js"
  ],
  "/my_connections": [
    "static/chunks/pages/my_connections.js"
  ],
  "/profile": [
    "static/chunks/pages/profile.js"
  ],
  "/view_profile/[username]": [
    "static/chunks/pages/view_profile/[username].js"
  ],
  "__rewrites": {
    "afterFiles": [],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/",
    "/_app",
    "/_error",
    "/api/hello",
    "/dashboard",
    "/discover",
    "/login",
    "/my_connections",
    "/profile",
    "/view_profile/[username]"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()