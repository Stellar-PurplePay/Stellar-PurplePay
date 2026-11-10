const request = require("supertest");
const express = require("express");
const docRoutes = require("./docRoutes");

describe("Documentation Routes (/api/docs)", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use("/api/docs", docRoutes);
  });

  it("GET /api/docs/json should return 200 with parsed OpenAPI specification", async () => {
    const res = await request(app).get("/api/docs/json");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.openapi).toMatch(/^3\.1\./);
    expect(res.body.info.title).toContain("Stellar PurplePay");
  });

  it("GET /api/docs should return 200 with HTML Swagger UI page", async () => {
    const res = await request(app).get("/api/docs");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("SwaggerUIBundle");
    expect(res.text).toContain("/api/docs/json");
    expect(res.text).toContain("Stellar PurplePay API Documentation");
  });
});
