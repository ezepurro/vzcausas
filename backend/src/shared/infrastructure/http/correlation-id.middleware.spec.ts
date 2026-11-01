import { IncomingMessage, ServerResponse } from "node:http";
import { resolveCorrelationId } from "./correlation-id.middleware";

/**
 * What matters is that the id written to the response header and the
 * `reqId` of the request logger are one and the same, whichever of the
 * two middlewares asks first.
 */
describe("resolveCorrelationId", () => {
  function fakeRequest(header?: string) {
    const req = { headers: header ? { "x-correlation-id": header } : {} };
    const res = { setHeader: jest.fn() };
    return {
      req: req as unknown as IncomingMessage & { correlationId?: string },
      res: res as unknown as ServerResponse,
      setHeader: res.setHeader,
    };
  }

  it.each([
    ["honors a caller-supplied id", "gateway-id-1", "gateway-id-1"],
    ["replaces an id longer than 128 characters", "x".repeat(129), undefined],
  ])("%s", (_, header, expected) => {
    const { req, res, setHeader } = fakeRequest(header);

    const id = resolveCorrelationId(req, res);

    if (expected !== undefined) expect(id).toBe(expected);
    else expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(setHeader).toHaveBeenCalledWith("X-Correlation-Id", id);
  });

  it("returns the same id on a second call without generating another", () => {
    const { req, res, setHeader } = fakeRequest();

    const first = resolveCorrelationId(req, res);
    const second = resolveCorrelationId(req, res);

    expect(second).toBe(first);
    expect(setHeader).toHaveBeenCalledTimes(1);
  });
});
