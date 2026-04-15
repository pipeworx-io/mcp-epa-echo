interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * EPA ECHO MCP — wraps EPA ECHO Web Services (free, no auth)
 *
 * Search EPA-regulated facilities, compliance history, violations,
 * enforcement actions, and find facilities in significant non-compliance.
 *
 * Base URL: https://echodata.epa.gov/echo
 */


const BASE = 'https://echodata.epa.gov/echo';

// ── Types ───────────────────────────────────────────────────────────

type FacilitySearchResponse = {
  Results?: {
    FacilityCount?: string;
    Facilities?: RawFacility[];
  };
};

type RawFacility = {
  RegistryId?: string;
  FacName?: string;
  FacStreet?: string;
  FacCity?: string;
  FacState?: string;
  FacZip?: string;
  FacLat?: string;
  FacLong?: string;
  CWAStatus?: string;
  CAAStatus?: string;
  RCRAStatus?: string;
  SDWISStatus?: string;
  FacSICCodes?: string;
  FacNAICSCodes?: string;
  FacQtrsWithNC?: string;
  FacInspectionCount?: string;
  FacFormalActionCount?: string;
  FacPenalties?: string;
};

type DfrResponse = {
  Results?: Record<string, unknown>;
};

// ── Helpers ─────────────────────────────────────────────────────────

async function echoFetch(path: string, params: Record<string, string>): Promise<unknown> {
  params.output = 'JSON';
  const qs = new URLSearchParams(params);
  const url = `${BASE}${path}?${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EPA ECHO API error: ${res.status} ${res.statusText}`);
  return res.json();
}

function cleanFacility(f: RawFacility) {
  return {
    registry_id: f.RegistryId ?? null,
    name: f.FacName ?? null,
    street: f.FacStreet ?? null,
    city: f.FacCity ?? null,
    state: f.FacState ?? null,
    zip: f.FacZip ?? null,
    latitude: f.FacLat ? Number(f.FacLat) : null,
    longitude: f.FacLong ? Number(f.FacLong) : null,
    cwa_status: f.CWAStatus ?? null,
    caa_status: f.CAAStatus ?? null,
    rcra_status: f.RCRAStatus ?? null,
    sdwis_status: f.SDWISStatus ?? null,
    sic_codes: f.FacSICCodes ?? null,
    naics_codes: f.FacNAICSCodes ?? null,
    quarters_in_noncompliance: f.FacQtrsWithNC ? Number(f.FacQtrsWithNC) : null,
    inspection_count: f.FacInspectionCount ? Number(f.FacInspectionCount) : null,
    formal_action_count: f.FacFormalActionCount ? Number(f.FacFormalActionCount) : null,
    total_penalties: f.FacPenalties ? Number(f.FacPenalties) : null,
  };
}

// ── Tool definitions ────────────────────────────────────────────────

const tools: McpToolExport['tools'] = [
  {
    name: 'echo_facility_search',
    description:
      'Search EPA-regulated facilities by name, state, ZIP, city, or NAICS code. Returns registry IDs, addresses, compliance status, and program affiliations (CWA, CAA, RCRA).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        facility_name: { type: 'string', description: 'Facility name (partial match).' },
        state: { type: 'string', description: 'Two-letter state abbreviation (e.g., "CA").' },
        zip: { type: 'string', description: 'ZIP code.' },
        city: { type: 'string', description: 'City name.' },
        naics: { type: 'string', description: 'NAICS industry code.' },
        limit: { type: 'number', description: 'Max results to return (default 20, max 100).' },
      },
    },
  },
  {
    name: 'echo_compliance_history',
    description:
      'Get compliance and enforcement history for a specific EPA-regulated facility. Returns compliance status, quarters in violation, inspection dates, and enforcement actions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        registry_id: {
          type: 'string',
          description: 'EPA Registry ID (from echo_facility_search results).',
        },
      },
      required: ['registry_id'],
    },
  },
  {
    name: 'echo_violations',
    description:
      'Get detailed violation records for a facility, optionally filtered by environmental program (CWA, CAA, RCRA).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        registry_id: {
          type: 'string',
          description: 'EPA Registry ID (from echo_facility_search results).',
        },
        program: {
          type: 'string',
          description: 'Environmental program filter: "CWA" (water), "CAA" (air), or "RCRA" (waste). Defaults to CWA.',
        },
      },
      required: ['registry_id'],
    },
  },
  {
    name: 'echo_enforcement_actions',
    description:
      'Get enforcement case details for a facility, including formal/informal actions, penalties assessed, and penalty amounts.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        registry_id: {
          type: 'string',
          description: 'EPA Registry ID (from echo_facility_search results).',
        },
      },
      required: ['registry_id'],
    },
  },
  {
    name: 'echo_search_by_violation',
    description:
      'Find facilities currently in significant non-compliance. Filter by state and/or environmental program.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        state: { type: 'string', description: 'Two-letter state abbreviation (e.g., "TX").' },
        program: {
          type: 'string',
          description: 'Program filter: "CWA", "CAA", "RCRA", or "ALL" (default "ALL").',
        },
        limit: { type: 'number', description: 'Max results to return (default 20, max 100).' },
      },
    },
  },
];

// ── Tool implementations ────────────────────────────────────────────

async function facilitySearch(args: Record<string, unknown>) {
  const params: Record<string, string> = {};
  if (args.facility_name) params.p_fn = String(args.facility_name);
  if (args.state) params.p_st = String(args.state);
  if (args.zip) params.p_zip = String(args.zip);
  if (args.city) params.p_ct = String(args.city);
  if (args.naics) params.p_naics = String(args.naics);

  const limit = Math.min(100, Math.max(1, Number(args.limit) || 20));
  params.p_p = '1';
  params.responseset = String(limit);

  if (!params.p_fn && !params.p_st && !params.p_zip && !params.p_ct && !params.p_naics) {
    throw new Error('At least one search parameter is required (facility_name, state, zip, city, or naics).');
  }

  const data = (await echoFetch('/echo_rest_services.get_facilities', params)) as FacilitySearchResponse;
  const facilities = data.Results?.Facilities ?? [];

  return {
    total_count: Number(data.Results?.FacilityCount ?? 0),
    returned: facilities.length,
    facilities: facilities.map(cleanFacility),
  };
}

async function complianceHistory(args: Record<string, unknown>) {
  const registryId = String(args.registry_id);
  const data = (await echoFetch('/dfr_rest_services.get_compliance_summary', {
    p_id: registryId,
  })) as DfrResponse;

  return {
    registry_id: registryId,
    compliance_summary: data.Results ?? {},
  };
}

async function violations(args: Record<string, unknown>) {
  const registryId = String(args.registry_id);
  const program = String(args.program ?? 'CWA').toUpperCase();

  let endpoint: string;
  switch (program) {
    case 'CAA':
      endpoint = '/dfr_rest_services.get_air_compliance';
      break;
    case 'RCRA':
      endpoint = '/dfr_rest_services.get_rcra_compliance';
      break;
    case 'CWA':
    default:
      endpoint = '/dfr_rest_services.get_cwa_eff_compliance';
      break;
  }

  const data = (await echoFetch(endpoint, { p_id: registryId })) as DfrResponse;

  return {
    registry_id: registryId,
    program,
    violations: data.Results ?? {},
  };
}

async function enforcementActions(args: Record<string, unknown>) {
  const registryId = String(args.registry_id);
  const data = (await echoFetch('/dfr_rest_services.get_enforcement_summary', {
    p_id: registryId,
  })) as DfrResponse;

  return {
    registry_id: registryId,
    enforcement_summary: data.Results ?? {},
  };
}

async function searchByViolation(args: Record<string, unknown>) {
  const params: Record<string, string> = {
    p_qiv: 'GT0',
  };

  if (args.state) params.p_st = String(args.state);

  const program = String(args.program ?? 'ALL').toUpperCase();
  if (program !== 'ALL') params.p_ptype = program;

  const limit = Math.min(100, Math.max(1, Number(args.limit) || 20));
  params.p_p = '1';
  params.responseset = String(limit);

  const data = (await echoFetch('/echo_rest_services.get_facilities', params)) as FacilitySearchResponse;
  const facilities = data.Results?.Facilities ?? [];

  return {
    total_count: Number(data.Results?.FacilityCount ?? 0),
    returned: facilities.length,
    program,
    facilities: facilities.map(cleanFacility),
  };
}

// ── Router ──────────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'echo_facility_search':
      return facilitySearch(args);
    case 'echo_compliance_history':
      return complianceHistory(args);
    case 'echo_violations':
      return violations(args);
    case 'echo_enforcement_actions':
      return enforcementActions(args);
    case 'echo_search_by_violation':
      return searchByViolation(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 5 } } satisfies McpToolExport;
