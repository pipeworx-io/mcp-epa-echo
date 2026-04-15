# mcp-epa-echo

EPA ECHO MCP — wraps EPA ECHO Web Services (free, no auth)

Part of the [Pipeworx](https://pipeworx.io) open MCP gateway.

## Tools

| Tool | Description |
|------|-------------|

## Quick Start

Add to your MCP client config:

```json
{
  "mcpServers": {
    "epa-echo": {
      "url": "https://gateway.pipeworx.io/epa-echo/mcp"
    }
  }
}
```

Or use the CLI:

```bash
npx pipeworx use epa-echo
```

## License

MIT
