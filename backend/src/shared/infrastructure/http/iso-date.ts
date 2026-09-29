/**
 * Serializes a {@link Date} as ISO 8601 **with the explicit UTC
 * offset of the given time zone** — `2026-09-19T08:12:00-03:00` —
 * rather than the `Z` form produced by `Date.toISOString()`.
 *
 * That is the shape the API contract documents (§4) and what the
 * study's users read on screen without mental conversion (D-53).
 *
 * Implemented on `Intl.DateTimeFormat` so the offset is derived from
 * the IANA time zone database instead of being hardcoded: Argentina
 * sits at `-03:00` year-round today, but a future DST rule — or a
 * deployment for another jurisdiction — would silently corrupt every
 * timestamp if the offset were a constant.
 *
 * @param timeZone IANA identifier, e.g. `America/Argentina/Cordoba`.
 */
export function toIsoWithOffset(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    // `hourCycle: "h23"` rather than `hour12: false`: the latter
    // renders midnight as "24" under some ICU versions, which would
    // produce an invalid timestamp.
    hourCycle: "h23",
    // Yields "GMT-03:00"; "GMT" alone when the zone is UTC.
    timeZoneName: "longOffset",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  const zoneName = get("timeZoneName");
  const offset = zoneName === "GMT" ? "+00:00" : zoneName.replace("GMT", "");

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${offset}`;
}
