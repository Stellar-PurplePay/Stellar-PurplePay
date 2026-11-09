const {
  sanitizeString,
  sanitizeValue,
  sanitizeInputMiddleware,
} = require("./inputSanitizer");

describe("inputSanitizer", () => {
  describe("sanitizeString", () => {
    it("strips script tags and inline event handlers", () => {
      const malicious = 'Hello <script>alert("pwned")</script> World <img src=x onerror=alert(1) />';
      const sanitized = sanitizeString(malicious);
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("</script>");
      expect(sanitized).not.toContain("onerror=");
      expect(sanitized).toContain("Hello  World <img src=x alert(1) />");
    });

    it("strips javascript: pseudoprotocol and null bytes", () => {
      const payload = "test\x00payload javascript:stealCookies()";
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain("\x00");
      expect(sanitized).not.toContain("javascript:");
      expect(sanitized).toBe("testpayload stealCookies()");
    });
  });

  describe("sanitizeValue", () => {
    it("strips __proto__ and prototype pollution attempts", () => {
      const evilPayload = JSON.parse(
        '{"title": "Valid Job", "__proto__": {"admin": true}, "constructor": {"prototype": {"polluted": true}}}'
      );
      const cleaned = sanitizeValue(evilPayload);

      expect(cleaned.title).toBe("Valid Job");
      expect(Object.prototype.hasOwnProperty.call(cleaned, "__proto__")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(cleaned, "constructor")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(cleaned, "prototype")).toBe(false);
      expect(Object.prototype).not.toHaveProperty("admin");
      expect(Object.prototype).not.toHaveProperty("polluted");
    });

    it("sanitizes nested structures and arrays recursively", () => {
      const payload = {
        name: "Freelancer <script>evil()</script>",
        milestones: [
          { desc: 'Phase 1 <svg onload=alert("XSS")>', amount: 100 },
          { desc: "Phase 2", amount: 200 },
        ],
      };
      const cleaned = sanitizeValue(payload);

      expect(cleaned.name).toBe("Freelancer ");
      expect(cleaned.milestones[0].desc).not.toContain("onload=");
      expect(cleaned.milestones[0].amount).toBe(100);
      expect(cleaned.milestones[1].amount).toBe(200);
    });

    it("handles circular references without throwing call stack errors", () => {
      const circularObj = { name: "Root" };
      circularObj.self = circularObj;

      expect(() => sanitizeValue(circularObj)).not.toThrow();
      const cleaned = sanitizeValue(circularObj);
      expect(cleaned.name).toBe("Root");
    });
  });

  describe("sanitizeInputMiddleware", () => {
    it("sanitizes req.body, req.query, and req.params", () => {
      const req = {
        body: { memo: "Payment <script>steal()</script>" },
        query: { search: "jobs javascript:alert(1)" },
        params: { id: "job\x00123" },
      };
      const res = {};
      const next = jest.fn();

      sanitizeInputMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.memo).toBe("Payment ");
      expect(req.query.search).toBe("jobs alert(1)");
      expect(req.params.id).toBe("job123");
    });
  });
});
