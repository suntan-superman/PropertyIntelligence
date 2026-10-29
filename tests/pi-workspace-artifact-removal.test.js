import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createDurablePropertyService,
  DurablePropertyError,
} from "../src/investment-workspace/durable-properties.js";
import { createMemoryDurablePropertyRepository } from "../src/investment-workspace/memory-durable-properties.js";
import { createCommercialService } from "../src/commercial/commercial-service.js";
import { createMemoryCommercialRepository } from "../src/commercial/memory-commercial-repository.js";
import { ROLES } from "../src/auth/access-control.js";

const analyst = {
  uid: "analyst-one",
  role: ROLES.ANALYST,
  organizationId: "organization-one",
};
const otherTenant = {
  uid: "analyst-two",
  role: ROLES.ANALYST,
  organizationId: "organization-two",
};
const subject = {
  ref: "SUBJECT-ONE",
  address: "1 Synthetic St, Test City, CA 90001",
  addressComponents: {
    street: "1 Synthetic St",
    city: "Test City",
    state: "CA",
    zip: "90001",
  },
  evidenceFingerprint: "snapshot-one",
  subjectKind: "PRELIMINARY_RESEARCH",
};
const scenario = {
  id: "scenario-one",
  propertyRef: subject.ref,
  evidenceFingerprint: subject.evidenceFingerprint,
  name: "Scenario 1",
  revision: 1,
  savedAt: "2026-10-29T20:00:00.000Z",
};

function durableFixture() {
  const repository = createMemoryDurablePropertyRepository();
  return {
    repository,
    service: createDurablePropertyService({
      repository,
      clock: () => new Date("2026-10-29T20:00:00.000Z"),
      idFactory: () => "property-one",
    }),
  };
}

test("scenario removal is blocked until its generated reports are removed", async () => {
  const fixture = durableFixture();
  const property = await fixture.service.promote({
    user: analyst,
    subject,
    scenario,
  });
  const report = await fixture.service.linkReport({
    user: analyst,
    subjectRef: subject.ref,
    scenario,
    kind: "full",
    filename: "synthetic-report.pdf",
    status: "DOWNLOADED",
  });

  await assert.rejects(
    () =>
      fixture.service.removeScenario({
        user: analyst,
        id: property.id,
        scenarioId: scenario.id,
      }),
    (error) =>
      error instanceof DurablePropertyError &&
      error.code === "SCENARIO_HAS_REPORTS" &&
      error.details.reportCount === 1,
  );

  await assert.rejects(
    () =>
      fixture.service.removeReport({
        user: otherTenant,
        id: property.id,
        reportId: report.id,
      }),
    (error) =>
      error instanceof DurablePropertyError &&
      error.code === "DURABLE_PROPERTY_NOT_FOUND",
  );

  await fixture.service.removeReport({
    user: analyst,
    id: property.id,
    reportId: report.id,
  });
  const removed = await fixture.service.removeScenario({
    user: analyst,
    id: property.id,
    scenarioId: scenario.id,
  });
  assert.deepEqual(removed, { scenarioId: scenario.id, revisionsRemoved: 1 });
  assert.deepEqual(
    await fixture.service.scenarioRevisions({ user: analyst, id: property.id }),
    [],
  );
  assert.deepEqual(
    await fixture.service.reports({ user: analyst, id: property.id }),
    [],
  );
  const preserved = await fixture.service.get({
    user: analyst,
    id: property.id,
  });
  assert.equal(preserved.address, subject.address);
});

test("finalized report removal deletes private bytes, revokes viewer access and preserves an audit tombstone", async () => {
  const repository = createMemoryCommercialRepository();
  const service = createCommercialService({
    repository,
    clock: () => new Date("2026-10-29T21:00:00.000Z"),
  });
  const viewer = {
    uid: "viewer-one",
    role: ROLES.REPORT_VIEWER,
    organizationId: analyst.organizationId,
  };
  const report = {
    id: "report-one",
    propertyId: "property-one",
    scenarioId: scenario.id,
    revision: 1,
    filename: "synthetic-report.pdf",
    generatedAt: "2026-10-29T20:00:00.000Z",
  };
  await repository.putMember(analyst.organizationId, {
    uid: viewer.uid,
    role: viewer.role,
    status: "ACTIVE",
  });
  await service.registerReport({
    user: analyst,
    report,
    storage: { sha256: "a".repeat(64), sizeBytes: 2048 },
  });
  await service.grantReportAccess({
    user: analyst,
    reportId: report.id,
    viewerUid: viewer.uid,
    propertyId: report.propertyId,
  });
  const removedStorage = [];
  const result = await service.removeReport({
    user: analyst,
    reportId: report.id,
    propertyId: report.propertyId,
    removeStorage: async (input) => removedStorage.push(input),
  });

  assert.equal(result.removed, true);
  assert.equal(result.grantsRevoked, 1);
  assert.deepEqual(removedStorage, [
    { organizationId: analyst.organizationId, reportId: report.id },
  ]);
  assert.equal(
    await repository.getReportManifest(analyst.organizationId, report.id),
    null,
  );
  assert.deepEqual(await service.authorizedReports({ user: viewer }), []);
  const audit = await repository.listAudit(analyst.organizationId, 10);
  assert.equal(audit[0].kind, "REPORT_REMOVED");
  assert.equal(audit[0].sizeBytes, 2048);
});

test("workspace exposes clear report and scenario removal controls", async () => {
  const [workspace, registry, auth] = await Promise.all([
    readFile("apps/web/src/features/desktop-shell/MyWorkspace.jsx", "utf8"),
    readFile("apps/web/src/features/desktop-shell/report-registry.js", "utf8"),
    readFile("src/auth/netlify-auth.js", "utf8"),
  ]);
  assert.match(workspace, /Remove Report/);
  assert.match(workspace, /Remove Scenario/);
  assert.match(workspace, /Remove reports first/);
  assert.match(registry, /removeReportReference/);
  assert.match(auth, /request\.method\s*===\s*["']DELETE/);
  assert.match(auth, /removeStorage/);
});
