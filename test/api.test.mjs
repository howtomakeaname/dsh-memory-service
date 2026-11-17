import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryApiRoute } from "../src/api.mjs";

function makeReq(method, url, body) {
  return { method, url, async *[Symbol.asyncIterator]() { if (body !== undefined) yield Buffer.from(JSON.stringify(body)); } };
}
function makeRes() {
  return { status: 0, body: "", writeHead(status) { this.status = status; }, end(body) { this.body = body; } };
}
test("api: POST state returns ok envelope", async () => {
  const route = createMemoryApiRoute({ methods: { state: () => ({ notes: 3 }) }, admits: () => true });
  const res = makeRes();
  await route.handler(makeReq("POST", "/memory-service/api/state", {}), res);
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true, value: { notes: 3 } });
});
test("api: rejects GET and unknown methods", async () => {
  const route = createMemoryApiRoute({ methods: { state: () => ({}) }, admits: () => true });
  const getRes = makeRes();
  await route.handler(makeReq("GET", "/memory-service/api/state"), getRes);
  assert.equal(getRes.status, 405);
  const unknownRes = makeRes();
  await route.handler(makeReq("POST", "/memory-service/api/nope", {}), unknownRes);
  assert.equal(unknownRes.status, 404);
});
test("api: admits false returns forbidden", async () => {
  const route = createMemoryApiRoute({ methods: { state: () => ({}) }, admits: () => false });
  const res = makeRes();
  await route.handler(makeReq("POST", "/memory-service/api/state", {}), res);
  assert.equal(res.status, 403);
});
