const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
});
const body = async (request, maximum = 2_000_000) => {
  const text = await request.text();
  if (Buffer.byteLength(text) > maximum) throw Object.assign(new Error("INVESTOR_REQUEST_TOO_LARGE"), { status: 413 });
  try { return JSON.parse(text); } catch { throw Object.assign(new Error("INVESTOR_JSON_INVALID"), { status: 400 }); }
};
const orgFrom = (request, input) => input?.organizationId ?? new URL(request.url).searchParams.get("organizationId") ?? undefined;
const mutation = (request, authentication, adapted) => {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw Object.assign(new Error("AUTHENTICATION_ORIGIN_REQUIRED"), { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw Object.assign(new Error("INVESTOR_JSON_REQUIRED"), { status: 415 });
  authentication.requireCsrf(adapted);
};
const safePublicAccess = ({ access, campaign, investor, recipient }) => ({
  access: { expiresAt: access.expiresAt, status: access.status },
  investor,
  campaign: {
    id: campaign.id,
    propertyAddress: campaign.deal?.propertyAddress,
    deal: campaign.deal,
    reportFilename: campaign.reportFilename,
    status: campaign.status,
  },
  response: { status: recipient.responseStatus, pipelineStatus: recipient.pipelineStatus, respondedAt: recipient.respondedAt ?? null },
});

export async function handlePublicInvestorApi({ request, path, investorCrm, reportStorage }) {
  if (path !== "/api/investor-access" || request.method !== "POST") return null;
  if (typeof investorCrm !== "function") return json(503, { error: "INVESTOR_CRM_NOT_CONFIGURED" });
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json"))
    return json(403, { error: "INVESTOR_ACCESS_ORIGIN_REQUIRED" });
  const input = await body(request, 32_000), service = await investorCrm(), action = String(input.action ?? "VIEW").toUpperCase();
  if (action === "VIEW") return json(200, safePublicAccess(await service.authorizeToken(input.token)));
  if (action === "RESPOND") return json(200, await service.respond({ token: input.token, ...input.response }));
  if (action === "UNSUBSCRIBE") return json(200, await service.unsubscribe({ token: input.token }));
  if (action === "DOWNLOAD") {
    if (typeof reportStorage !== "function") return json(503, { error: "COMMERCIAL_REPORT_STORAGE_NOT_CONFIGURED" });
    const authorized = await service.authorizeToken(input.token), stored = await (await reportStorage()).get({
      organizationId: authorized.access.organizationId,
      reportId: authorized.access.reportId,
      expectedSha256: authorized.access.reportStorageSha256,
    });
    return new Response(stored.bytes, { status: 200, headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(stored.bytes.length),
      "Content-Disposition": `attachment; filename="${String(authorized.access.reportFilename ?? "Investor Package.pdf").replace(/["\\/]/g, "_").slice(0, 180)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }});
  }
  return json(422, { error: "INVESTOR_ACCESS_ACTION_INVALID" });
}

export async function handleAuthenticatedInvestorApi({ request, path, adapted, user, authentication, investorCrm, commercial }) {
  if (!path.startsWith("/api/investor-crm")) return null;
  if (typeof investorCrm !== "function") return json(503, { error: "INVESTOR_CRM_NOT_CONFIGURED" });
  const service = await investorCrm(), url = new URL(request.url);
  if (path === "/api/investor-crm/bootstrap" && request.method === "GET")
    return json(200, await service.bootstrap({ user, organizationId: url.searchParams.get("organizationId") ?? undefined }));
  if (path === "/api/investor-crm/export" && request.method === "GET") {
    const csv = await service.exportCsv({ user, organizationId: url.searchParams.get("organizationId") ?? undefined });
    return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=investor-directory.csv", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }});
  }
  const investorRoute = path.match(/^\/api\/investor-crm\/investors(?:\/([A-Za-z0-9._-]{1,128}))?$/);
  if (investorRoute && request.method === "GET") return json(200, investorRoute[1]
    ? { investor: await service.get({ user, organizationId: url.searchParams.get("organizationId") ?? undefined, id: investorRoute[1] }) }
    : { investors: await service.list({ user, organizationId: url.searchParams.get("organizationId") ?? undefined }) });
  if (investorRoute && investorRoute[1] !== "merge" && ["POST", "PATCH", "DELETE"].includes(request.method)) {
    mutation(request, authentication, adapted); const input = await body(request);
    if (request.method === "POST") return json(201, { investor: await service.create({ user, organizationId: orgFrom(request, input), investor: input.investor }) });
    if (request.method === "PATCH") return json(200, { investor: await service.update({ user, organizationId: orgFrom(request, input), id: investorRoute[1], investor: input.investor }) });
    return json(200, { investor: await service.archive({ user, organizationId: orgFrom(request, input), id: investorRoute[1], archived: true }) });
  }
  if (path === "/api/investor-crm/import/preview" && request.method === "POST") {
    mutation(request, authentication, adapted); const input = await body(request); return json(200, await service.previewImport({ user, organizationId: orgFrom(request, input), ...input }));
  }
  if (path === "/api/investor-crm/import/commit" && request.method === "POST") {
    mutation(request, authentication, adapted); const input = await body(request); return json(201, await service.commitImport({ user, organizationId: orgFrom(request, input), ...input }));
  }
  if (path === "/api/investor-crm/import/template" && request.method === "POST") {
    mutation(request, authentication, adapted); const input = await body(request); return json(201, { template: await service.saveTemplate({ user, organizationId: orgFrom(request, input), ...input }) });
  }
  if (path === "/api/investor-crm/investors/merge" && request.method === "POST") {
    mutation(request, authentication, adapted); const input = await body(request); return json(200, { investor: await service.merge({ user, organizationId: orgFrom(request, input), targetId: input.targetId, sourceId: input.sourceId }) });
  }
  if (path === "/api/investor-crm/match" && request.method === "POST") {
    mutation(request, authentication, adapted); const input = await body(request); return json(200, await service.match({ user, organizationId: orgFrom(request, input), deal: input.deal }));
  }
  if (path === "/api/investor-crm/campaigns" && request.method === "GET")
    return json(200, { campaigns: await service.campaigns({ user, organizationId: url.searchParams.get("organizationId") ?? undefined }) });
  if (path === "/api/investor-crm/campaigns" && request.method === "POST") {
    mutation(request, authentication, adapted); const input = await body(request), organizationId = orgFrom(request, input);
    if (typeof commercial !== "function") return json(503, { error: "COMMERCIAL_REPORT_ACCESS_NOT_CONFIGURED" });
    const report = await (await commercial()).reportForOrganization({ user, organizationId, reportId: input.reportId });
    if (report.propertyId !== input.deal?.propertyId || report.scenarioId !== input.scenarioId || Number(report.revision) !== Number(input.revision))
      return json(409, { error: "CAMPAIGN_REPORT_BINDING_MISMATCH" });
    return json(201, { campaign: await service.createCampaign({ user, organizationId, report, deal: input.deal, investorIds: input.investorIds, expiresAt: input.expiresAt }) });
  }
  const dispatch = path.match(/^\/api\/investor-crm\/campaigns\/([A-Za-z0-9._-]{1,128})\/dispatch$/);
  if (dispatch && request.method === "POST") { mutation(request, authentication, adapted); const input = await body(request); return json(200, await service.dispatch({ user, organizationId: orgFrom(request, input), campaignId: dispatch[1], ...input })); }
  const transition = path.match(/^\/api\/investor-crm\/campaigns\/([A-Za-z0-9._-]{1,128})\/pipeline$/);
  if (transition && request.method === "POST") { mutation(request, authentication, adapted); const input = await body(request); return json(200, { recipient: await service.transition({ user, organizationId: orgFrom(request, input), campaignId: transition[1], ...input }) }); }
  const revoke = path.match(/^\/api\/investor-crm\/access\/([A-Fa-f0-9]{64})\/revoke$/);
  if (revoke && request.method === "POST") { mutation(request, authentication, adapted); const input = await body(request); return json(200, { access: await service.revokeAccess({ user, organizationId: orgFrom(request, input), tokenHash: revoke[1] }) }); }
  return json(404, { error: "INVESTOR_CRM_ROUTE_NOT_FOUND" });
}
