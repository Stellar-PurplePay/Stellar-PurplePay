const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const openApiSpecPath = path.resolve(__dirname, "../docs/openapi.json");

/**
 * GET /api/docs/json
 * Returns raw OpenAPI 3.1 JSON specification.
 */
router.get("/json", (_req, res) => {
  if (!fs.existsSync(openApiSpecPath)) {
    return res.status(404).json({ error: "OpenAPI specification not found" });
  }
  const spec = JSON.parse(fs.readFileSync(openApiSpecPath, "utf8"));
  res.setHeader("Content-Type", "application/json");
  return res.json(spec);
});

/**
 * GET /api/docs
 * Serves an interactive Swagger UI HTML interface.
 */
router.get("/", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stellar PurplePay API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/docs/json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html");
  return res.send(html);
});

module.exports = router;
