import { layerUrl } from '../../config/kern.js';

const FIELD_CONCEPTS = Object.freeze({
  atn: [
    /\bassessor tax (?:number|no)\b/i,
    /\bassessor[_ ]?tax[_ ]?(?:number|no)\b/i,
    /^atn$/i,
  ],
  apn: [
    /\bassessor parcel (?:number|no)\b/i,
    /\bparcel (?:number|no)\b/i,
    /^apn$/i,
  ],
  situs_address: [/\bsitus\b.*\baddress\b/i, /^situs$/i, /\bsite address\b/i],
  use_code: [/\buse code\b/i, /^use[_ ]?code$/i],
  acreage: [/\bacreage\b/i, /^acres?$/i],
  legal_type: [/\blegal type\b/i, /^legal[_ ]?type$/i],
  land_value: [/\bland value\b/i, /^land[_ ]?value$/i],
  improvement_value: [
    /\bimprovement value\b/i,
    /^improvement[_ ]?value$/i,
    /^imp[_ ]?value$/i,
  ],
  other_improvement_value: [/\bother improvement value\b/i, /^other[_ ]?imp/i],
  personal_property_value: [/\bpersonal property value\b/i, /^personal[_ ]?prop/i],
  exemption_value: [/\bexemption value\b/i, /^exempt(?:ion)?[_ ]?value$/i],
  tax_rate_area: [/\btax rate area\b/i, /^tra$/i],
  roll_type: [/\broll type\b/i, /^roll[_ ]?type$/i],
});

function searchableFieldText(field) {
  return `${field.name || ''} ${field.alias || ''}`
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function discoverFieldCandidates(layerMetadata) {
  const fields = Array.isArray(layerMetadata.fields) ? layerMetadata.fields : [];
  const discovered = {};

  for (const [concept, patterns] of Object.entries(FIELD_CONCEPTS)) {
    discovered[concept] = fields
      .filter((field) => patterns.some((pattern) => pattern.test(searchableFieldText(field))))
      .map((field) => ({ name: field.name, alias: field.alias, type: field.type }));
  }

  return discovered;
}

export function resolveRequiredIdentifiers(layerMetadata, candidates) {
  const objectIdField = layerMetadata.objectIdField;
  const objectIdMatches = (layerMetadata.fields || []).filter(
    (field) => field.name === objectIdField && field.type === 'esriFieldTypeOID',
  );

  if (objectIdMatches.length !== 1) {
    throw new Error(
      `SCHEMA_ERROR: expected exactly one Object ID field named ${JSON.stringify(objectIdField)}, found ${objectIdMatches.length}`,
    );
  }

  if (candidates.atn.length !== 1) {
    const names = candidates.atn.map((field) => field.name).join(', ') || 'none';
    throw new Error(
      `SCHEMA_ERROR: ATN field mapping is ambiguous; expected exactly one candidate, found ${candidates.atn.length}: ${names}`,
    );
  }

  return {
    object_id: objectIdMatches[0].name,
    atn: candidates.atn[0].name,
  };
}

function capabilityValue(layerMetadata, name) {
  return layerMetadata.advancedQueryCapabilities?.[name] ?? 'not reported';
}

export function summarizeMetadata(serviceMetadata, layerMetadata) {
  const candidates = discoverFieldCandidates(layerMetadata);
  const required = resolveRequiredIdentifiers(layerMetadata, candidates);

  return {
    inspected_at: new Date().toISOString(),
    service_url: serviceMetadata.currentVersion
      ? serviceMetadata.serviceDescription !== undefined
        ? 'verified'
        : 'metadata returned'
      : 'metadata returned',
    layer: {
      id: layerMetadata.id,
      name: layerMetadata.name,
      object_id_field: layerMetadata.objectIdField,
      geometry_type: layerMetadata.geometryType,
      spatial_reference: layerMetadata.extent?.spatialReference || layerMetadata.sourceSpatialReference || null,
      maximum_record_count: layerMetadata.maxRecordCount ?? serviceMetadata.maxRecordCount ?? null,
      supported_query_formats: layerMetadata.supportedQueryFormats || null,
      capabilities: layerMetadata.capabilities || serviceMetadata.capabilities || null,
      supports_pagination: capabilityValue(layerMetadata, 'supportsPagination'),
      supports_order_by: capabilityValue(layerMetadata, 'supportsOrderBy'),
      supports_statistics: capabilityValue(layerMetadata, 'supportsStatistics'),
    },
    required_fields: required,
    candidate_fields: candidates,
  };
}

function markdownCell(value) {
  if (value === null || value === undefined || value === '') return 'Not reported';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function renderDataDictionary(serviceUrl, layerMetadata, summary) {
  const lines = [
    '# Kern POC-1 Data Dictionary',
    '',
    '> Generated from live ArcGIS Layer metadata. Field meanings below are limited to names, aliases, and types reported by Kern County; no unreported semantics are inferred.',
    '',
    `- Source: ${serviceUrl}`,
    `- Retrieved: ${summary.inspected_at}`,
    `- Layer: ${summary.layer.id} — ${summary.layer.name}`,
    `- Object ID field: \`${summary.required_fields.object_id}\``,
    `- Verified ATN field mapping: \`${summary.required_fields.atn}\``,
    '',
    '## Layer characteristics',
    '',
    '| Property | Observed value |',
    '| --- | --- |',
    `| Geometry type | ${markdownCell(summary.layer.geometry_type)} |`,
    `| Spatial reference | \`${markdownCell(JSON.stringify(summary.layer.spatial_reference))}\` |`,
    `| Maximum record count | ${markdownCell(summary.layer.maximum_record_count)} |`,
    `| Query formats | ${markdownCell(summary.layer.supported_query_formats)} |`,
    `| Capabilities | ${markdownCell(summary.layer.capabilities)} |`,
    `| Pagination | ${markdownCell(summary.layer.supports_pagination)} |`,
    `| Order by | ${markdownCell(summary.layer.supports_order_by)} |`,
    `| Statistics | ${markdownCell(summary.layer.supports_statistics)} |`,
    '',
    '## Candidate normalized fields',
    '',
    '| Target concept | Metadata candidates |',
    '| --- | --- |',
  ];

  for (const [concept, fields] of Object.entries(summary.candidate_fields)) {
    const rendered = fields.length
      ? fields.map((field) => `\`${field.name}\` (${field.alias}, ${field.type})`).join('<br>')
      : 'Unavailable in observed metadata';
    lines.push(`| ${concept} | ${rendered} |`);
  }

  lines.push('', '## All observed fields', '', '| Name | Alias | ArcGIS type | Length | Nullable |', '| --- | --- | --- | ---: | --- |');
  for (const field of layerMetadata.fields || []) {
    lines.push(
      `| \`${markdownCell(field.name)}\` | ${markdownCell(field.alias)} | ${markdownCell(field.type)} | ${markdownCell(field.length)} | ${markdownCell(field.nullable)} |`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

export function observedLayerUrl(config) {
  return layerUrl(config);
}
