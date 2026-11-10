const { S3StorageService, MAX_FILE_SIZE_BYTES } = require("./s3StorageService");

describe("S3StorageService", () => {
  let service;

  beforeEach(() => {
    service = new S3StorageService({
      bucketName: "test-purplepay-escrow",
      region: "eu-central-1",
    });
  });

  describe("generateUploadPresignedUrl", () => {
    it("generates presigned upload URL with expected headers and expiry", () => {
      const result = service.generateUploadPresignedUrl({
        key: "evidence/job-101/contract.pdf",
        contentType: "application/pdf",
        maxSizeBytes: 5 * 1024 * 1024,
        expiresInSeconds: 300,
      });

      expect(result.uploadUrl).toContain("https://test-purplepay-escrow.s3.eu-central-1.amazonaws.com");
      expect(result.uploadUrl).toContain("evidence/job-101/contract.pdf");
      expect(result.contentType).toBe("application/pdf");
      expect(result.requiredHeaders["x-amz-server-side-encryption"]).toBe("AES256");
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it("rejects forbidden or dangerous MIME types", () => {
      const forbiddenTypes = [
        "text/html",
        "application/javascript",
        "application/x-sh",
        "application/x-msdownload",
      ];

      for (const type of forbiddenTypes) {
        expect(() =>
          service.generateUploadPresignedUrl({
            key: "evil.html",
            contentType: type,
          })
        ).toThrow("not permitted for secure upload");
      }
    });

    it("enforces maximum file size limit", () => {
      expect(() =>
        service.generateUploadPresignedUrl({
          key: "huge_file.zip",
          contentType: "application/zip",
          maxSizeBytes: MAX_FILE_SIZE_BYTES + 1,
        })
      ).toThrow("exceeds upper bound");
    });

    it("clamps expiry duration to allowable bounds", () => {
      // Below 60s clamped to 60s
      const lowResult = service.generateUploadPresignedUrl({
        key: "doc.pdf",
        contentType: "application/pdf",
        expiresInSeconds: 10,
      });
      expect(lowResult.uploadUrl).toContain("X-Amz-Expires=60");

      // Above 900s clamped to 900s
      const highResult = service.generateUploadPresignedUrl({
        key: "doc.pdf",
        contentType: "application/pdf",
        expiresInSeconds: 5000,
      });
      expect(highResult.uploadUrl).toContain("X-Amz-Expires=900");
    });
  });

  describe("generateDownloadPresignedUrl", () => {
    it("generates presigned download URL", () => {
      const result = service.generateDownloadPresignedUrl("evidence/job-101/contract.pdf");
      expect(result.downloadUrl).toContain("https://test-purplepay-escrow.s3.eu-central-1.amazonaws.com");
      expect(result.key).toBe("evidence/job-101/contract.pdf");
    });

    it("rejects empty keys", () => {
      expect(() => service.generateDownloadPresignedUrl("")).toThrow(
        "Storage key is required for download"
      );
    });
  });
});

