import { serializeRequest } from "./request-log.serializers";

describe("serializeRequest", () => {
  // ARQUITECTURA_BACKEND_V1.md §7.9: no personal data and no session in logs.
  it("keeps id, method and path, dropping the query string and the headers", () => {
    const serialized = serializeRequest({
      id: "corr-1",
      method: "GET",
      url: "/api/v1/cases?search=Gomez&page=2",
      headers: { authorization: "Bearer abc", cookie: "refresh_token=xyz" },
    } as Parameters<typeof serializeRequest>[0]);

    expect(serialized).toEqual({
      id: "corr-1",
      method: "GET",
      path: "/api/v1/cases",
    });
  });
});
