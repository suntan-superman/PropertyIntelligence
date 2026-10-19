-- Authorized 2026-10-13: secure the exact 26 audited backend-only PI tables.
-- The migration runner supplies the transaction and checksum-ledger entry.
-- Preserve migrations 001-006, existing policies, and postgres/service_role access.
-- Do not change the four already-protected tables or future-object defaults.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.acquisition_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparable_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diligence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_record_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_condition_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_condition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_encumbrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_intelligence_schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.acquisition_decisions,
  public.analysis_snapshots,
  public.audit_events,
  public.comparable_snapshots,
  public.comparables,
  public.deal_claims,
  public.deals,
  public.diligence_items,
  public.discovery_records,
  public.discovery_signals,
  public.discovery_sources,
  public.documents,
  public.evidence_snapshots,
  public.idempotency_keys,
  public.opportunity_candidates,
  public.opportunity_record_links,
  public.opportunity_reviews,
  public.opportunity_signals,
  public.properties,
  public.property_aliases,
  public.property_condition_assessments,
  public.property_condition_items,
  public.property_encumbrances,
  public.property_intelligence_schema_migrations,
  public.reports,
  public.valuations
FROM PUBLIC, anon, authenticated;
