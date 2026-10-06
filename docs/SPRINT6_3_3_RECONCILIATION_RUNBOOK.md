# Sprint 6.3.3 Reconciliation Runbook

## Dry-run command

Use explicit IDs only. The command is read-only and requires `--dry-run`:

```text
npm run opportunity:property:reconcile -- --candidate-id <candidate-id> --property-id <property-id> --dry-run
```

It validates the candidate and Property rows, active canonical-address resolution, candidate/Assessor identity compatibility, existing active link/conflict state, and the exact normalized address relationship. It reports the planned link row without writing it. It performs zero RentCast, Google, or county calls and does not refresh Property evidence.

The apply path is intentionally separate and narrowly allowlisted. It first reruns
the dry-run, checks the certified migration ledger and protected-record
fingerprints, and accepts only the authorized 3484 Haven candidate/Property IDs:

```text
npm run opportunity:property:reconcile:apply -- --candidate-id 01a98c28-a14b-4c60-ab10-581684c99389 --property-id 37cb8526-c1e7-4896-8525-a9cdb82f370b --apply
```

No other pair can use `--apply`. The transaction inserts one
`OPPORTUNITY_ANALYSIS_WORKFLOW` / `EXPLICIT_WORKFLOW_CONTEXT` ACTIVE row with a
deterministic idempotency key, then a separate-connection reopen and replay
certify the row and preservation fingerprints. If any precondition differs, it
stops before writing.

## Controlled 3484 Haven packet

The first real workflow is identified only by its persisted IDs in the generated validation artifact. No address-string search or fuzzy match is used. The packet must include:

- candidate and Property safe labels/IDs;
- active canonical resolution ID/status;
- ATN/APN9 evidence context;
- origin recoverability;
- active-link/conflict counts;
- exact planned insert values;
- proof that Property evidence row IDs/fingerprints are read-only;
- provider-call count (`0`).

## Apply boundary

The real 3484 Haven apply is now authorized and certified in
`data/validation/sprint6_3_3-reconciliation-apply.json`. Do not create a Deal,
refresh evidence, alter candidate status/score, alter Assessor data, link any
other pair, or deploy application code.
