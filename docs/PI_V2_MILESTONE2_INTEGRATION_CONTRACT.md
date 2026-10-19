# PI V2.0 Milestone 2 — SellMyKernHome Lead Intake Contract

## Status and boundary

Contract version: `pi.lead-intake.v1`

This contract is implemented and certified for local/offline use only. It is not enabled for public traffic. The current PI workbench binds to loopback, requires its exact local host, and the intake remains disabled unless the server is explicitly given a secret of at least 32 characters. The SellMyKernHome repository was inspected but not modified.

A submitted lead is a seller statement. It is not a verified Property, parcel match, title record, distressed-status determination, or investment opportunity.

## Endpoint and authentication

`POST /api/lead-intake/v1`

Required headers:

- `Content-Type: application/json`
- `X-PI-Lead-Source: sellmykernhome.com`
- `X-PI-Timestamp: <ISO-8601 timestamp>`
- `X-PI-Signature: v1=<lowercase HMAC-SHA256 hex>`

The signing payload is the exact UTF-8 request body prefixed by the timestamp:

```text
HMAC_SHA256(secret, X-PI-Timestamp + "." + exact_request_body)
```

The signature is compared using a timing-safe comparison. Timestamps expire after five minutes. An absent or short secret disables intake. The request body is capped at 32 KiB, the default in-memory rate limit is 20 requests per source per minute, and the response contains no contact details.

## Request schema

```json
{
  "contractVersion": "pi.lead-intake.v1",
  "source": "sellmykernhome.com",
  "externalLeadId": "site-generated-stable-id",
  "submittedAt": "2026-10-15T20:00:00.000Z",
  "origin": {
    "site": "sellmykernhome.com",
    "form": "seller_inquiry",
    "landingPath": "/sell"
  },
  "address": {
    "line1": "123 Example St",
    "city": "Bakersfield",
    "state": "CA",
    "postalCode": "93301"
  },
  "contact": {
    "name": "Example Seller",
    "preferred": "email",
    "email": "seller@example.invalid",
    "phone": ""
  },
  "consent": {
    "privacyAcknowledged": true,
    "privacyVersion": "site-policy-version",
    "marketingConsent": false,
    "capturedAt": "2026-10-15T20:00:00.000Z"
  },
  "sellerStatements": {
    "propertyType": "Single-family home",
    "condition": "Needs updates",
    "occupancy": "Owner occupied",
    "desiredTiming": "Exploring options",
    "comments": "Seller-provided text"
  },
  "photoReferences": [
    {
      "reference": "private-object-reference",
      "url": "https://private-storage.example.invalid/object",
      "mediaType": "image/jpeg"
    }
  ]
}
```

Validation is allow-listed and length-bounded. California, city, ZIP, seller name, a usable preferred contact method, and privacy-consent evidence are required. Photo entries must be HTTPS references; the endpoint does not accept binary uploads.

## Existing website field mapping

| SellMyKernHome retained field | PI V1 field | Treatment |
| --- | --- | --- |
| `submission_token` | `externalLeadId` | Stable site identifier and idempotency input |
| `created_at` | `submittedAt` | Submission timestamp |
| `source_site` | `source`, `origin.site` | Must equal `sellmykernhome.com` |
| `property_address` | `address.line1` | Seller supplied; not canonical identity |
| `property_city` | `address.city` | Seller supplied |
| fixed site jurisdiction | `address.state` | `CA` in the explicit adapter |
| `property_zip` | `address.postalCode` | Seller supplied |
| `first_name` + `last_name` | `contact.name` | Combined for queue presentation |
| `preferred_contact` | `contact.preferred` | `email` or `phone` |
| `email`, `phone` | matching contact fields | Private contact data |
| `consent.privacy_acknowledged` | `consent.privacyAcknowledged` | Required true |
| `consent.privacy_version` | `consent.privacyVersion` | Required |
| `consent.marketing_consent` | `consent.marketingConsent` | Preserved separately |
| `consent.privacy_at` | `consent.capturedAt` | Required timestamp |
| `property_type` | `sellerStatements.propertyType` | Seller statement |
| `property_condition` | `sellerStatements.condition` | Seller statement, not inspection evidence |
| `occupancy` | `sellerStatements.occupancy` | Seller statement |
| `desired_timing` | `sellerStatements.desiredTiming` | Seller statement |
| `message` | `sellerStatements.comments` | Bounded to 2,000 characters |
| `attribution.landing_url` pathname | `origin.landingPath` | Query string omitted |

## Idempotency and retry behavior

PI hashes `source + NUL + externalLeadId` for the idempotency key. The first valid submission creates one local lead and returns HTTP 201. A later valid request with the same key returns the original lead ID with HTTP 200, `duplicate: true`, and `duplicateReviewRequired: true`. It does not create or overwrite a lead.

The website may safely retry only when it cannot determine whether a transmission was received, using the identical external lead ID. Automatic retries must be bounded and must never mint a new ID for the same form submission. HTTP 4xx responses require correction or review, not blind retry. PI keeps duplicate review explicit.

## Queue and state contract

States are `NEW`, `NEEDS_REVIEW`, `IN_RESEARCH`, `UNDERWRITTEN`, and `ARCHIVED`.

Local reviewer actions are:

- **Review Lead** — moves the record to `NEEDS_REVIEW`.
- **Research Address** — runs exact retained-evidence address search only; it makes no provider call and stores match references plus `providerCalls: 0`.
- **Start Analysis** — is offered only for a retained match and preserves the retained subject/evidence binding.
- **Archive** — moves the record to `ARCHIVED` without deletion.
- **Save Scenario / Generate Report** — reuse the existing revisioned scenario and report engines after the analyst enters the workflow.

## Security and privacy requirements for staging

Before any externally reachable staging pilot:

1. Add authenticated, role-based access to the Incoming Leads queue. Local-origin checks are not multi-user authorization.
2. Provision the HMAC secret in managed server-side secret storage and rotate it independently of browser builds.
3. Put the website sender behind a server-only route; never sign in browser JavaScript.
4. Use TLS, ingress allow-listing where feasible, centralized rate limiting, audit events without PII, and least-privilege storage credentials.
5. Define retention, deletion, incident-response, and reviewer-access policies for contact data.
6. Store future photos in a private object store with encryption, malware/type/size scanning, non-public object IDs, and short-lived signed access. Persist only references and necessary metadata in the lead record.
7. Complete a staging-only threat/privacy review and confirm consent-language compatibility before transmitting real leads.

No secret is present in the browser bundle, no production migration was created, and no external lead was transmitted in this milestone.

