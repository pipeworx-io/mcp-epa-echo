# EPA ECHO — Enforcement and Compliance History

The U.S. Environmental Protection Agency's Enforcement and Compliance History Online (ECHO). Facility-level compliance status, inspection history, formal and informal enforcement actions, permit data (Clean Air Act, Clean Water Act, RCRA, etc.). The authoritative source for "is this facility in trouble with EPA?" Free, no auth.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Why this matters for AI agents

For environmental risk assessment, regulatory due diligence, and ESG analysis, EPA ECHO is the primary source for what's actually happening with EPA enforcement. Self-reported emissions data is one thing; ECHO tells you when the EPA actually showed up and took action.

Common flows:

- **Facility lookup.** "Find facilities for company X." → `echo_facility_search({name: "X"})` → matching facilities with their EPA Registry IDs, compliance status, recent enforcement.
- **Facility detail.** Once you have a facility ID, follow-up tools surface inspection history, permits, violations, formal actions.
- **Geographic search.** Find all facilities in a ZIP code, county, or state with active enforcement.

Used by the `environmental_risk` recipe alongside GHG emissions and TRI data.

## Auth

None. ECHO is fully public and free. Pipeworx forwards a polite User-Agent.

## What EPA tracks via ECHO

| Program | What it covers |
|---|---|
| **CAA** (Clean Air Act) | Major emitters, NSPS standards, NESHAP toxic air pollutants |
| **CWA / NPDES** | Water discharge permits, effluent limits, biosolids |
| **RCRA** | Hazardous waste generators, transporters, treatment/storage/disposal facilities |
| **SDWA** | Public water systems |
| **TRI** | Toxic Release Inventory reporters (separate `tri_facility_releases` tool) |

A single facility can be regulated under multiple programs; ECHO surfaces all.

## Compliance status decoded

| Status | Meaning |
|---|---|
| In compliance | No active violations |
| Significant Violator | Major program-level violation |
| High Priority Violator (HPV) | Air-program-specific severe non-compliance |
| Formal action issued | EPA or state has filed a legal action |
| Informal action | Warning letter, notice of violation |
| Active enforcement | An enforcement case is open |

For risk-tier assessment, "Significant Violator" + "Active enforcement" is High; clean record + closed historical violations is Low.

## Common pitfalls

- **Multi-facility companies.** Big companies have many EPA-regulated facilities; the company-name search returns all matches. Cluster by parent company in your output, not by facility.
- **State-delegated programs.** Most EPA programs are administered by state environmental agencies. ECHO has the data but enforcement-action attribution can name the state, not EPA.
- **Permit ≠ enforcement.** A facility holding a Clean Air Act Title V permit isn't "in trouble" — most major emitters need them. Distinguish permits (operating authorization) from enforcement (regulatory action).
- **Lag.** ECHO updates monthly; settlements and recent inspections may not appear for 30–60 days.
- **Self-reported data.** Compliance status often derives from self-reported monitoring data. The most damning enforcement signal is usually formal action, not raw violation counts.
- **Closed facilities.** Decommissioned facilities still appear in ECHO with historical records. Filter to "Active" facility status for current operations only.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "epa-echo": {
      "url": "https://gateway.pipeworx.io/epa-echo/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Epa Echo data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
