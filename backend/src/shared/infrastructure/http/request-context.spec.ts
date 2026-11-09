import { RequestContext } from "./request-context";

describe("RequestContext", () => {
  it("fuera de una petición no hay correlation id", () => {
    expect(RequestContext.correlationId()).toBeNull();
  });

  it("dentro de run lo ve todo lo que se ejecuta, también después de un await", async () => {
    const seen = await RequestContext.run("corr-1", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return RequestContext.correlationId();
    });

    expect(seen).toBe("corr-1");
    expect(RequestContext.correlationId()).toBeNull();
  });

  it("dos peticiones simultáneas no se mezclan", async () => {
    const read = (id: string, delay: number) =>
      RequestContext.run(id, async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return RequestContext.correlationId();
      });

    expect(await Promise.all([read("a", 5), read("b", 1)])).toEqual(["a", "b"]);
  });
});
