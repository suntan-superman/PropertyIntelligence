const clone = (value) => (value == null ? value : structuredClone(value));
const key = (organizationId, id) => `${organizationId}:${id}`;

export function createMemoryInvestorRepository() {
  const investors = new Map(),
    imports = new Map(),
    templates = new Map(),
    campaigns = new Map(),
    recipients = new Map(),
    access = new Map(),
    activities = new Map(),
    audits = new Map();
  const rows = (map, organizationId) => {
    if (!map.has(organizationId)) map.set(organizationId, []);
    return map.get(organizationId);
  };
  return {
    async listInvestors(org) {
      return clone([...investors.values()].filter((item) => item.organizationId === org));
    },
    async getInvestor(org, id) {
      return clone(investors.get(key(org, id)) ?? null);
    },
    async createInvestor(org, record) {
      if (investors.has(key(org, record.id)))
        throw Object.assign(new Error("INVESTOR_EXISTS"), { status: 409 });
      investors.set(key(org, record.id), clone(record));
      return clone(record);
    },
    async updateInvestor(org, id, patch) {
      const prior = investors.get(key(org, id));
      if (!prior) return null;
      const next = { ...prior, ...clone(patch), id, organizationId: org };
      investors.set(key(org, id), next);
      return clone(next);
    },
    async saveImport(org, record) {
      const existing = imports.get(key(org, record.id));
      if (existing) return clone(existing);
      imports.set(key(org, record.id), clone(record));
      return clone(record);
    },
    async getImport(org, id) {
      return clone(imports.get(key(org, id)) ?? null);
    },
    async updateImport(org, id, patch) {
      const prior = imports.get(key(org, id));
      if (!prior) return null;
      const next = { ...prior, ...clone(patch) };
      imports.set(key(org, id), next);
      return clone(next);
    },
    async saveTemplate(org, record) {
      templates.set(key(org, record.id), clone(record));
      return clone(record);
    },
    async listTemplates(org) {
      return clone([...templates.values()].filter((item) => item.organizationId === org));
    },
    async createCampaign(org, record) {
      campaigns.set(key(org, record.id), clone(record));
      return clone(record);
    },
    async getCampaign(org, id) {
      return clone(campaigns.get(key(org, id)) ?? null);
    },
    async listCampaigns(org) {
      return clone([...campaigns.values()].filter((item) => item.organizationId === org));
    },
    async updateCampaign(org, id, patch) {
      const prior = campaigns.get(key(org, id));
      if (!prior) return null;
      const next = { ...prior, ...clone(patch) };
      campaigns.set(key(org, id), next);
      return clone(next);
    },
    async putRecipient(org, record) {
      recipients.set(key(org, record.id), clone(record));
      return clone(record);
    },
    async getRecipient(org, id) {
      return clone(recipients.get(key(org, id)) ?? null);
    },
    async listRecipients(org, campaignId) {
      return clone([...recipients.values()].filter((item) => item.organizationId === org && item.campaignId === campaignId));
    },
    async saveAccess(record) {
      access.set(record.tokenHash, clone(record));
      return clone(record);
    },
    async getAccess(tokenHash) {
      return clone(access.get(tokenHash) ?? null);
    },
    async updateAccess(tokenHash, patch) {
      const prior = access.get(tokenHash);
      if (!prior) return null;
      const next = { ...prior, ...clone(patch) };
      access.set(tokenHash, next);
      return clone(next);
    },
    async createActivity(org, record) {
      rows(activities, org).push(clone(record));
      return clone(record);
    },
    async listActivities(org, filters = {}) {
      return clone(rows(activities, org).filter((item) =>
        (!filters.investorId || item.investorId === filters.investorId) &&
        (!filters.campaignId || item.campaignId === filters.campaignId)));
    },
    async audit(org, record) {
      rows(audits, org).push(clone(record));
      return record.id;
    },
    async listAudit(org) {
      return clone(rows(audits, org));
    },
  };
}
