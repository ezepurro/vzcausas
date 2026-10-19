import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { UnauthorizedError } from "@shared/domain/domain-error";
import { InternalTriggerGuard } from "./internal-trigger.guard";

const SECRET = "correct-secret";

function contextWithHeader(header?: string): ExecutionContext {
  const request: Partial<Request> = {
    headers: header !== undefined ? { "x-internal-trigger-secret": header } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function build(): InternalTriggerGuard {
  const config = { getOrThrow: () => SECRET } as unknown as ConfigService;
  return new InternalTriggerGuard(config);
}

describe("InternalTriggerGuard", () => {
  it("lets the request through when the header matches the configured secret", () => {
    const guard = build();
    expect(guard.canActivate(contextWithHeader(SECRET))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const guard = build();
    expect(() => guard.canActivate(contextWithHeader("wrong-secret"))).toThrow(
      UnauthorizedError,
    );
  });

  it("rejects a missing header", () => {
    const guard = build();
    expect(() => guard.canActivate(contextWithHeader())).toThrow(UnauthorizedError);
  });

  it("rejects a secret of different length without throwing on the comparison itself", () => {
    const guard = build();
    expect(() => guard.canActivate(contextWithHeader("short"))).toThrow(
      UnauthorizedError,
    );
  });
});
