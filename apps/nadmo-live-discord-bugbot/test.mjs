import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifySignature } from "./worker.mjs";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const rawPublicKey = publicKey.export({ format: "der", type: "spki" })
  .subarray(-32).toString("hex");
const body = '{"type":1}';
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString("hex");
const request = new Request("https://example.invalid/interactions", {
  method: "POST",
  headers: {
    "x-signature-ed25519": signature,
    "x-signature-timestamp": timestamp
  },
  body
});
assert.equal(await verifySignature(request, body, rawPublicKey), true);
assert.equal(await verifySignature(request, body + " ", rawPublicKey), false);
assert.equal(await verifySignature(request, body, "00".repeat(32)), false);
const expired = new Request("https://example.invalid/interactions", {
  method: "POST",
  headers: {
    "x-signature-ed25519": signature,
    "x-signature-timestamp": String(Number(timestamp) - 600)
  },
  body
});
assert.equal(await verifySignature(expired, body, rawPublicKey), false);
console.log("PASS: Ed25519 signature validation and stale timestamp rejection");
