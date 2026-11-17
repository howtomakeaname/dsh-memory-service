import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createProfileSynthesizer } from "../src/retrieval/profile.mjs";
import { MemoryService } from "../src/store.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-profile-test-")); }

test("profile: synthesizes only preference/user memories", async () => {
  const seen = [];
  const llm = { available: true, async complete({ user }) { seen.push(user); return { ok: true, text: "- likes pnpm\\n- prefers concise Chinese answers" }; } };
  const synth = createProfileSynthesizer({ llm });
  const text = await synth.synthesize([
    { id: "a", revision: 1, updatedAt: "2026-01-01", status: "active", type: "preference", title: "Package manager", description: "likes", body: "I prefer pnpm" },
    { id: "b", revision: 1, updatedAt: "2026-01-01", status: "active", type: "project", title: "Project", description: "fact", body: "uses redis" }
  ]);
  assert.match(text, /pnpm/);
  assert.match(seen[0], /Package manager/);
  assert.doesNotMatch(seen[0], /uses redis/);
});

test("profile: no llm or no prefs returns null", async () => {
  const synth = createProfileSynthesizer({ llm: { available: false } });
  assert.equal(await synth.synthesize([{ type: "preference", status: "active" }]), null);
  const good = createProfileSynthesizer({ llm: { available: true } });
  assert.equal(await good.synthesize([]), null);
});

test("context: profile is injected and preference notes are not duplicated", () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "profile-ctx" }).init();
  service.upsert({ scope: "workspace:profile-ctx", title: "Comedy taste", description: "likes", body: "I love stand-up comedy.", type: "preference" });
  const context = service.context({ scope: "workspace:profile-ctx", profile: "- likes stand-up comedy" });
  assert.match(context.text, /Synthesized user profile/);
  assert.match(context.text, /stand-up comedy/);
  assert.doesNotMatch(context.text, /Comedy taste/);
  service.close();
});
