# Sprint 6.3.3 Lineage Model

## Schema audit

The existing `opportunity_candidates.resolved_property_id` column is a nullable foreign key to `properties`. It provides neither an origin/method, address-resolution or Assessor references, immutable history, idempotency identity, nor a uniqueness guard preventing an unrelated candidate from reusing the same Property. `candidate_address_resolutions` is candidate-scoped but does not itself establish a Property relationship. The existing field therefore cannot safely satisfy the Sprint 6.3.3 lineage and conflict requirements.

Decision: add the additive `006_opportunity_property_links.sql` migration. It
was isolated-certified and then applied exactly once to production under the
authorized migration gate. The single authorized 3484 Haven lineage row is
now applied and certified; no other linkage is authorized.

## Durable relationship

`opportunity_property_links` stores the exact candidate and Property IDs plus optional active canonical-address and Assessor-enrichment IDs, origin, method, lifecycle status, creation context, and idempotency key. Active candidate and active Property partial unique indexes prevent duplicate or unrelated active links. Foreign keys are restrictive. Link history is append-only; only a supersession update is permitted by the trigger.

The pre-existing `resolved_property_id` remains historical compatibility data and is not used as a substitute for a new workflow link. Screening score, priority, score version, candidate status, and Assessor rows are not changed by Save Property linkage.

## Workflow

`candidate_id` is created by the server at Opportunity Analyze time and carried in a server-coherent workflow context:

`Opportunity -> active canonical address/Assessor evidence -> Analyze response/session -> Save Property -> link transaction`

The server rejects client context that does not match the server-held originating candidate context. Address strings, owner names, coordinates, APNs, AVMs, comps, and fuzzy matching are never used as link authorities. When an active canonical address is present, its normalized exact address must match the saved Property’s normalized address.

## Derived lifecycle

The UI/API derives workflow state from durable facts, independently of `kern-screen-v1`:

1. active linked Deal: `DEAL_CREATED`
2. active linked Property: `PROPERTY_SAVED`
3. active confirmed canonical address: `ADDRESS_RESOLVED`
4. no provider-ready address: `NEEDS_ADDRESS`
5. otherwise: `DISCOVERED`

This is presentation/workflow state only. It does not rewrite the imported candidate status or screening result.

## Scope boundary

Migration 006 is certified and applied. No provider/evidence refresh is
performed, no Deal is created, and the single 3484 Haven reconciliation is
certified. Production application certification is complete; no other pair may
be linked in this gate.
