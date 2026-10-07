import { ConfigService } from "@nestjs/config";
import { CordobaClockAdapter } from "./cordoba-clock.adapter";

describe("CordobaClockAdapter", () => {
  const clock = new CordobaClockAdapter({
    getOrThrow: () => "America/Argentina/Cordoba",
  } as unknown as ConfigService);

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("now() returns the current instant", () => {
    jest.setSystemTime(new Date("2026-10-07T01:30:00Z"));
    expect(clock.now()).toEqual(new Date("2026-10-07T01:30:00Z"));
  });

  it("today() is still the previous day in Córdoba while UTC has already changed day", () => {
    jest.setSystemTime(new Date("2026-10-07T01:30:00Z")); // 22:30 on the 6th in Córdoba
    expect(clock.today()).toEqual(new Date("2026-10-06T00:00:00.000Z"));
  });

  it("today() changes day at midnight Córdoba (03:00 UTC)", () => {
    jest.setSystemTime(new Date("2026-10-07T03:00:00Z"));
    expect(clock.today()).toEqual(new Date("2026-10-07T00:00:00.000Z"));
  });
});
