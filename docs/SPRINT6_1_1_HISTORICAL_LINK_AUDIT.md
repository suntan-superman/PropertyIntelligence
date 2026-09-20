# Sprint 6.1.1 historical linkage audit

Read-only audit: 2026-09-20T23:36:37.726Z. 6 decisions examined before any patch certification writes. No historical records changed.

| Decision | Classification | Deal | Compatible analyses |
| --- | --- | --- | --- |
| 1fd6b398-6cae-4e76-aa0f-45e781bc9c95 | UNRECOVERABLE | Missing | 0 |
| 4aff0c24-ff7c-40bb-9287-c5e98cf2fbeb | UNRECOVERABLE | Missing | 0 |
| 322e58d6-a664-4dfd-ba3b-15ed38b54885 | AMBIGUOUS | 54e8084c-c2f8-40c6-ba3a-afce54131117 | 1 |
| 2cd6bfc1-8b8c-4d07-8e5d-f73b599ac5b6 | AMBIGUOUS | b1f700ad-435b-49a7-ae81-41f87be4e502 | 1 |
| 87c8c229-579a-4c8b-ad6e-4e3fe77b2c67 | AMBIGUOUS | 4cda148f-3136-4168-94ae-974d33146414 | 1 |
| 0b7a3d79-b9db-436a-b9ae-8647227d891d | AMBIGUOUS | 4cda148f-3136-4168-94ae-974d33146414 | 1 |

## 1fd6b398-6cae-4e76-aa0f-45e781bc9c95

No linked Deal/compatible Analysis and no persisted derivation reference; exact linkage cannot be recovered from the retained records.

Evidence: a1b3e11b-18fd-4f99-882e-78b4d7e1520d. Row SHA-256: a5a6a80c7df984bfe376c077e7315e0abee1b8104b8f267e95a317062c6b38a0. Audit events: 1. Explicit Analysis references: 0.

## 4aff0c24-ff7c-40bb-9287-c5e98cf2fbeb

No linked Deal/compatible Analysis and no persisted derivation reference; exact linkage cannot be recovered from the retained records.

Evidence: a1b3e11b-18fd-4f99-882e-78b4d7e1520d. Row SHA-256: 82e69cdacad075bf8f0c50d5bc16a7a4bfc434cebf9e15c4628619e0e32f5bb7. Audit events: 1. Explicit Analysis references: 0.

## 322e58d6-a664-4dfd-ba3b-15ed38b54885

No persisted analysis ID or derivation fingerprint in decision inputs, outputs, or decision audit. Ownership/evidence compatibility and timestamps cannot establish exact derivation.

Evidence: bd0621d3-f9cf-4016-82d0-57c963300c72. Row SHA-256: 587de9eed62a44286c5b1eb09f99ebfb6bf6aaf08d7d45a2856f9b81cf272f75. Audit events: 1. Explicit Analysis references: 0.

## 2cd6bfc1-8b8c-4d07-8e5d-f73b599ac5b6

No persisted analysis ID or derivation fingerprint in decision inputs, outputs, or decision audit. Ownership/evidence compatibility and timestamps cannot establish exact derivation.

Evidence: 5cd9e055-ae5f-47ed-a502-a43d8f941339. Row SHA-256: 9e7598058ced58175189e752021a9eb486dfd64c00d5c7e899a84de970d287e1. Audit events: 1. Explicit Analysis references: 0.

## 87c8c229-579a-4c8b-ad6e-4e3fe77b2c67

No persisted analysis ID or derivation fingerprint in decision inputs, outputs, or decision audit. Ownership/evidence compatibility and timestamps cannot establish exact derivation.

Evidence: a54efe70-9ec2-40d3-b9ce-0cbc4936be97. Row SHA-256: ea16432c79b436542f73cd89bb1948533e8b7b32fd1101d7b46d52e0c0212ddd. Audit events: 1. Explicit Analysis references: 0.

## 0b7a3d79-b9db-436a-b9ae-8647227d891d

No persisted analysis ID or derivation fingerprint in decision inputs, outputs, or decision audit. Ownership/evidence compatibility and timestamps cannot establish exact derivation.

Evidence: a54efe70-9ec2-40d3-b9ce-0cbc4936be97. Row SHA-256: 4adceac15946f97a88f5b7d7a1c79e6c125bfff8ab0b6c925ea9aa2fa91b768f. Audit events: 1. Explicit Analysis references: 0.

## Repair mapping / implementation review gate

The explicit one-time repair mapping is empty. No LINKABLE_EXACT decision is established by this audit. No historical repair is authorized or applied. All six remain unchanged and REPORT_HISTORICAL_LINK_REQUIRED remains the required report response. Same-Deal, compatible Evidence, a lone Analysis, and nearest timestamps are deliberately insufficient.

Machine evidence contains candidate IDs, fingerprints, payload hashes, timestamps and original row hashes in data/validation/sprint6_1_1-historical-audit.json. It contains no raw claims, connection strings or provider credentials. Inputs/outputs were inspected in memory; candidate matches do not prove which Analysis was used. Any future exact mapping must be independently proven and reviewed before a one-time audited repair.
