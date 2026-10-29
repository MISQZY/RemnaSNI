import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); vi.resetModules(); });
it("shares the fetch across games and retains each game's last good value", async () => {
  vi.useFakeTimers();
  vi.stubEnv("REMNAWEB_URL", "https://example.test");
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ a: 1, b: 2 })).mockResolvedValueOnce(Response.json({ a: 3, b: "invalid" }));
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { remoteConfig } = await import("./remote-config");
  const a = remoteConfig("a", body => typeof (body as { a?: unknown })?.a === "number" ? (body as { a: number }).a : null);
  const b = remoteConfig("b", body => typeof (body as { b?: unknown })?.b === "number" ? (body as { b: number }).b : null);
  expect(await Promise.all([a(), b()])).toEqual([1, 2]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60_001);
  await a(); // stale while refreshing
  await vi.advanceTimersByTimeAsync(0);
  expect(await Promise.all([a(), b()])).toEqual([3, 2]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("keeps good rules when the parser throws and logs once for that response", async () => {
  vi.useFakeTimers();
  vi.stubEnv("REMNAWEB_URL", "https://example.test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ nested: { value: 7 } })).mockResolvedValueOnce(Response.json({ nested: null })));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const { remoteConfig } = await import("./remote-config");
  const parse = vi.fn(body => (body as { nested: { value: number } }).nested.value);
  const load = remoteConfig("throwing", parse);
  expect(await load()).toBe(7);
  await vi.advanceTimersByTimeAsync(60_001);
  expect(await load()).toBe(7);
  await vi.advanceTimersByTimeAsync(0);
  expect(await load()).toBe(7);
  expect(await load()).toBe(7);
  expect(parse).toHaveBeenCalledTimes(2);
  expect(log).toHaveBeenCalledTimes(1);
  expect(log.mock.calls[0][1]).toBeInstanceOf(TypeError);
});
