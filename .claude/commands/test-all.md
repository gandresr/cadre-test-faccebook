---
description: Run unit + integration tests against the Firestore emulator. Spins the emulator up if it's not running.
---

Run the full test suite, including integration tests that need the Firestore emulator.

1. **Check emulator**: see if anything is listening on `localhost:8080` (`lsof -i :8080`).
2. **Start emulator if needed**, in the background:
   ```bash
   firebase emulators:start --only firestore --project demo-cadre
   ```
   Wait until the emulator banner appears (or `nc -z localhost 8080` succeeds).
3. **Run the tests** with the emulator host set:
   ```bash
   FIRESTORE_EMULATOR_HOST=localhost:8080 FIRESTORE_PROJECT_ID=demo-cadre npm test
   ```
4. **Report only failures**, grouped by project (`unit`, `components`, `integration`).
5. If you started the emulator, leave it running for follow-up runs and tell the user the PID.

If the emulator fails to start (port in use, firebase CLI missing), tell the user and stop — do not try to "fix" their environment.
