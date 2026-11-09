const crypto = require("crypto");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "text/plain",
  "application/json",
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const DEFAULT_URL_EXPIRY_SECONDS = 300; // 5 minutes
const MAX_URL_EXPIRY_SECONDS = 900; // 15 minutes

class S3StorageService {
  constructor(options = {}) {
    this.bucketName = options.bucketName || process.env.AWS_S3_BUCKET || "stellar-purplepay-evidence";
    this.region = options.region || process.env.AWS_REGION || "us-east-1";
    this.s3Client = options.s3Client || null;
  }

  isMimeTypeAllowed(contentType) {
    if (!contentType || typeof contentType !== "string") return false;
    return ALLOWED_MIME_TYPES.has(contentType.toLowerCase().trim());
  }

  generateUploadPresignedUrl(params) {
    const { key, contentType, maxSizeBytes = MAX_FILE_SIZE_BYTES, expiresInSeconds = DEFAULT_URL_EXPIRY_SECONDS } = params;

    if (!key || typeof key !== "string" || key.trim().length === 0) {
      throw new Error("Storage key is required");
    }

    if (!this.isMimeTypeAllowed(contentType)) {
      throw new Error(`Content type ${contentType} is not permitted for secure upload`);
    }

    if (maxSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Max size exceeds upper bound of ${MAX_FILE_SIZE_BYTES} bytes`);
    }

    const expiry = Math.min(Math.max(60, expiresInSeconds), MAX_URL_EXPIRY_SECONDS);
    const expiresAt = Date.now() + expiry * 1000;
    const sanitizedKey = key.trim().replace(/^\/+/, "");

    // Cryptographic signature token for upload validation
    const tokenPayload = `${sanitizedKey}:${contentType}:${maxSizeBytes}:${expiresAt}`;
    const signature = crypto
      .createHmac("sha256", process.env.STORAGE_SIGNING_KEY || "stellar_s3_secret")
      .update(tokenPayload)
      .digest("hex");

    const uploadUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${sanitizedKey}?X-Amz-Signature=${signature}&X-Amz-Expires=${expiry}`;

    return {
      uploadUrl,
      key: sanitizedKey,
      expiresAt,
      contentType,
      maxSizeBytes,
      requiredHeaders: {
        "Content-Type": contentType,
        "x-amz-server-side-encryption": "AES256",
      },
    };
  }

  generateDownloadPresignedUrl(key, expiresInSeconds = DEFAULT_URL_EXPIRY_SECONDS) {
    if (!key || typeof key !== "string") {
      throw new Error("Storage key is required for download");
    }

    const sanitizedKey = key.trim().replace(/^\/+/, "");
    const expiry = Math.min(Math.max(60, expiresInSeconds), MAX_URL_EXPIRY_SECONDS);
    const expiresAt = Date.now() + expiry * 1000;

    const signature = crypto
      .createHmac("sha256", process.env.STORAGE_SIGNING_KEY || "stellar_s3_secret")
      .update(`GET:${sanitizedKey}:${expiresAt}`)
      .digest("hex");

    const downloadUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${sanitizedKey}?X-Amz-Signature=${signature}&X-Amz-Expires=${expiry}`;

    return {
      downloadUrl,
      key: sanitizedKey,
      expiresAt,
    };
  }
}

const defaultS3StorageService = new S3StorageService();

module.exports = {
  S3StorageService,
  defaultS3StorageService,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
};
