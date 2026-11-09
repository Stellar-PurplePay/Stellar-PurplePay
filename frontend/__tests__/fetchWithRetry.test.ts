import { fetchWithRetry } from "../utils/fetchWithRetry";

describe("fetchWithRetry utility", () => {
  let fetchMock: jest.Mock;

  const createMockResponse = (status: number, headers: Record<string, string> = {}) => ({
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (headerName: string) => headers[headerName] || headers[headerName.toLowerCase()] || null,
    },
  });

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it("resolves immediately on successful 200 response without retrying", async () => {
    const mockResponse = createMockResponse(200);
    fetchMock.mockResolvedValueOnce(mockResponse);

    const res = await fetchWithRetry("/api/data");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on HTTP 429 and respects Retry-After header", async () => {
    const rateLimitedResponse = createMockResponse(429, { "Retry-After": "1" });
    const successResponse = createMockResponse(200);

    fetchMock
      .mockResolvedValueOnce(rateLimitedResponse)
      .mockResolvedValueOnce(successResponse);

    const onRetry = jest.fn();
    const res = await fetchWithRetry("/api/stellar-data", {
      maxRetries: 2,
      initialDelayMs: 50,
      maxDelayMs: 200,
      onRetry,
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, 200, 429); // capped at maxDelayMs 200
  });

  it("retries on HTTP 503 with exponential backoff", async () => {
    const error503 = createMockResponse(503);
    const successResponse = createMockResponse(200);

    fetchMock
      .mockResolvedValueOnce(error503)
      .mockResolvedValueOnce(error503)
      .mockResolvedValueOnce(successResponse);

    const onRetry = jest.fn();
    const res = await fetchWithRetry("/api/rpc", {
      maxRetries: 3,
      initialDelayMs: 10,
      backoffMultiplier: 2,
      onRetry,
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 10, 503);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 20, 503);
  });

  it("stops and returns last response after exhausting maxRetries", async () => {
    const error502 = createMockResponse(502);
    fetchMock.mockResolvedValue(error502);

    const res = await fetchWithRetry("/api/unstable", {
      maxRetries: 2,
      initialDelayMs: 10,
    });

    expect(res.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("does not retry if request is aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchWithRetry("/api/aborted", { signal: controller.signal })
    ).rejects.toThrow("The user aborted a request.");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
