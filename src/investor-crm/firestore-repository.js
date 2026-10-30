const clone = (value) => (value == null ? value : structuredClone(value));
const safe = (value) => JSON.parse(JSON.stringify(value));

export function createFirestoreInvestorRepository({ firestore } = {}) {
  if (!firestore?.collection) throw new Error("FIRESTORE_ADMIN_REQUIRED");
  const org = (id) => firestore.collection("organizations").doc(id),
    sub = (organizationId, name) => org(organizationId).collection(name),
    list = async (organizationId, name) => {
      const snapshot = await sub(organizationId, name).get();
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
    get = async (organizationId, name, id) => {
      const snapshot = await sub(organizationId, name).doc(id).get();
      return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    },
    set = async (organizationId, name, id, value, merge = false) => {
      const ref = sub(organizationId, name).doc(id);
      await ref.set(safe(value), { merge });
      return get(organizationId, name, id);
    };
  return {
    listInvestors: (organizationId) => list(organizationId, "investors"),
    getInvestor: (organizationId, id) => get(organizationId, "investors", id),
    async createInvestor(organizationId, record) {
      const ref = sub(organizationId, "investors").doc(record.id);
      await ref.create(safe(record));
      return clone(record);
    },
    async updateInvestor(organizationId, id, patch) {
      const ref = sub(organizationId, "investors").doc(id),
        prior = await ref.get();
      if (!prior.exists) return null;
      await ref.set(safe(patch), { merge: true });
      return get(organizationId, "investors", id);
    },
    async saveImport(organizationId, record) {
      const ref = sub(organizationId, "investorImportRuns").doc(record.id);
      return firestore.runTransaction(async (transaction) => {
        const prior = await transaction.get(ref);
        if (prior.exists) return { id: prior.id, ...prior.data() };
        transaction.create(ref, safe(record));
        return clone(record);
      });
    },
    getImport: (organizationId, id) => get(organizationId, "investorImportRuns", id),
    updateImport: (organizationId, id, patch) => set(organizationId, "investorImportRuns", id, patch, true),
    saveTemplate: (organizationId, record) => set(organizationId, "investorImportMappings", record.id, record),
    listTemplates: (organizationId) => list(organizationId, "investorImportMappings"),
    async createCampaign(organizationId, record) {
      await sub(organizationId, "dealCampaigns").doc(record.id).create(safe(record));
      return clone(record);
    },
    getCampaign: (organizationId, id) => get(organizationId, "dealCampaigns", id),
    listCampaigns: (organizationId) => list(organizationId, "dealCampaigns"),
    updateCampaign: (organizationId, id, patch) => set(organizationId, "dealCampaigns", id, patch, true),
    putRecipient: (organizationId, record) => set(organizationId, "campaignRecipients", record.id, record),
    getRecipient: (organizationId, id) => get(organizationId, "campaignRecipients", id),
    async listRecipients(organizationId, campaignId) {
      const snapshot = await sub(organizationId, "campaignRecipients").where("campaignId", "==", campaignId).get();
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
    async saveAccess(record) {
      const ref = firestore.collection("investorReportAccess").doc(record.tokenHash);
      await ref.create(safe(record));
      return clone(record);
    },
    async getAccess(tokenHash) {
      const row = await firestore.collection("investorReportAccess").doc(tokenHash).get();
      return row.exists ? { tokenHash: row.id, ...row.data() } : null;
    },
    async updateAccess(tokenHash, patch) {
      const ref = firestore.collection("investorReportAccess").doc(tokenHash),
        prior = await ref.get();
      if (!prior.exists) return null;
      await ref.set(safe(patch), { merge: true });
      const next = await ref.get();
      return { tokenHash: next.id, ...next.data() };
    },
    async createActivity(organizationId, record) {
      await sub(organizationId, "investorActivities").doc(record.id).create(safe(record));
      return clone(record);
    },
    async listActivities(organizationId, filters = {}) {
      let query = sub(organizationId, "investorActivities");
      if (filters.investorId) query = query.where("investorId", "==", filters.investorId);
      else if (filters.campaignId) query = query.where("campaignId", "==", filters.campaignId);
      const snapshot = await query.get();
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
    async audit(organizationId, record) {
      const ref = sub(organizationId, "commercialAudit").doc(record.id);
      await ref.create(safe(record));
      return ref.id;
    },
    async listAudit(organizationId) {
      return list(organizationId, "commercialAudit");
    },
  };
}
