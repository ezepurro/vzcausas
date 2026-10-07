import { toIsoDate, toIsoWithOffset } from "./iso-date";

const CORDOBA = "America/Argentina/Cordoba";

describe("toIsoWithOffset", () => {
  it("renders an instant in the study's time zone with its offset", () => {
    // 11:12 UTC is 08:12 in Córdoba (UTC-3).
    expect(toIsoWithOffset(new Date("2026-09-19T11:12:00Z"), CORDOBA)).toBe(
      "2026-09-19T08:12:00-03:00",
    );
  });

  it("rolls the date back when the offset crosses midnight", () => {
    // 01:30 UTC on the 20th is still 22:30 on the 19th locally.
    expect(toIsoWithOffset(new Date("2026-09-20T01:30:00Z"), CORDOBA)).toBe(
      "2026-09-19T22:30:00-03:00",
    );
  });

  it("renders midnight as 00, not 24", () => {
    expect(toIsoWithOffset(new Date("2026-09-20T03:00:00Z"), CORDOBA)).toBe(
      "2026-09-20T00:00:00-03:00",
    );
  });

  it("uses +00:00 for UTC instead of the bare GMT label", () => {
    expect(toIsoWithOffset(new Date("2026-09-19T11:12:00Z"), "UTC")).toBe(
      "2026-09-19T11:12:00+00:00",
    );
  });
});

describe("toIsoDate", () => {
  it("renders a civil date as YYYY-MM-DD", () => {
    expect(toIsoDate(new Date("2021-03-12T00:00:00.000Z"))).toBe("2021-03-12");
  });

  it("keeps the last day of the month", () => {
    expect(toIsoDate(new Date("2029-02-28T00:00:00.000Z"))).toBe("2029-02-28");
  });
});
