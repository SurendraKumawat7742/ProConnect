self.__BUILD_MANIFEST = {
  "/dashboard": [
    "static/chunks/pages/dashboard.js"
  ],
  "/login": [
    "static/chunks/pages/login.js"
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