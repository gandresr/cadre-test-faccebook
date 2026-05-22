/**
 * Connectivity smoke: writes/reads/deletes a single doc against the real
 * Firestore project to confirm credentials + project ID + IAM all line up.
 *
 *   npx tsx scripts/smoke.ts
 *
 * Refuses to run against the emulator (defeats the purpose).
 */

export {};

async function main() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "Refusing to smoke-test the emulator. Unset FIRESTORE_EMULATOR_HOST and re-run.",
    );
  }
  if (!process.env.FIRESTORE_PROJECT_ID) {
    throw new Error("Missing FIRESTORE_PROJECT_ID");
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS");
  }

  const { db } = await import("../src/lib/firestore/admin");

  const ref = db.collection("_smoke").doc("ping");
  const ts = new Date().toISOString();
  await ref.set({ ok: true, at: ts });
  const snap = await ref.get();
  if (!snap.exists)
    throw new Error("write succeeded but read returned nothing");
  console.log("READ:", snap.data());
  await ref.delete();
  console.log(
    `OK — wrote, read, deleted _smoke/ping against ${process.env.FIRESTORE_PROJECT_ID}`,
  );
}

main().catch((err) => {
  console.error("SMOKE FAILED:", err);
  process.exit(1);
});
