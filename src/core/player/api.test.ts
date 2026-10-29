import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));
vi.mock("@/core/i18n/client", () => ({ tr: () => (key: string) => key }));
import { api } from "./api";
import { session, tokenIdentity } from "./session";
const token = (uid: string, exp: number) => `${btoa(JSON.stringify({ uid, v: 1, exp }))}.signature`;
afterEach(() => { session.signOut(); vi.unstubAllGlobals(); });
describe("session isolation", () => {
  it("discards a successful renewal after sign-out, including during JSON decoding", async () => {
    session.keep(token("alice", 1));
    let finish!: (body: object) => void;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: () => new Promise(resolve => { finish = resolve; }) })));
    const pending = api("gems");
    await Promise.resolve();
    session.signOut();
    finish({ session: token("alice", 2) });
    expect(await pending).toBeNull();
    expect(session.getSnapshot().token).toBeNull();
  });
  it("discards the old user's response after account change", async () => {
    session.keep(token("alice", 1));
    let finish!: (res: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { finish = resolve; })));
    const pending = api("progress");
    session.keep(token("bob", 1));
    finish(Response.json({ points: 100 }));
    expect(await pending).toBeNull();
    expect(session.getSnapshot().identity).toBe("bob:1");
  });
  it("keeps the generation stable for renewal of the same identity", () => {
    session.keep(token("alice", 1));
    const before = session.getGeneration();
    session.keep(token("alice", 2));
    expect(session.getGeneration()).toBe(before);
    expect(tokenIdentity(token("alice", 2))).toBe("alice:1");
  });
});
