# @kaspacom/defi-mcp

MCP server + CLI for [KaspaCom DeFi Protocol](https://kaspa.com) — DEX, Lending, and Launchpad on IGRA and Kasplex EVM networks.

Use it as an **MCP server** for Claude Desktop, OpenClaw, or any MCP-compatible AI agent, or as a standalone **CLI** for scripting and monitoring.

## Features

- **DEX** — Query liquidity pairs, token prices, portfolio balances (Uniswap V2 fork)
- **Lending** — View Aave V3 markets, rates, positions, health factors
- **Launchpad** — List active LFG token launches
- **4 networks** — IGRA mainnet/testnet, Kasplex mainnet/testnet
- **Read-only by default** — No wallet needed for queries. Write tools (swap, supply, borrow, etc.) coming in Phase 3.

## Installation

```bash
npm install @kaspacom/defi-mcp
```

Or clone and build locally:

```bash
git clone https://github.com/KASPACOM/kaspacom-defi-mcp.git
cd kaspacom-defi-mcp
npm install
npm run build
```

## Quick Start

### MCP Server (for AI agents)

```bash
# Read-only mode (no wallet needed)
MCP_NETWORK="igra-testnet" node dist/mcp/index.js

# With wallet for future write operations
MCP_WALLET_KEY="0xYOUR_KEY" MCP_NETWORK="igra-testnet" node dist/mcp/index.js
```

### CLI

```bash
# After npm install + build, or npm link
kaspacom-defi getPairs --network igra-testnet
kaspacom-defi getTokenPrice WKAS --network igra-testnet
kaspacom-defi getMarkets --network kasplex-testnet
kaspacom-defi getPosition 0xYOUR_ADDRESS --network igra-testnet
kaspacom-defi getPortfolio 0xYOUR_ADDRESS --network igra-testnet
kaspacom-defi getActiveLaunches --network igra-testnet
kaspacom-defi getProtocolInfo --network igra

# JSON output
kaspacom-defi getPairs --network igra-testnet --json
```

## MCP Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kaspacom-defi": {
      "command": "node",
      "args": ["/path/to/kaspacom-defi-mcp/dist/mcp/index.js"],
      "env": {
        "MCP_NETWORK": "igra-testnet"
      }
    }
  }
}
```

### OpenClaw

Add to your `openclaw.json` under `plugins.mcp.servers`:

```json
{
  "kaspacom-defi": {
    "command": "node",
    "args": ["/path/to/kaspacom-defi-mcp/dist/mcp/index.js"],
    "env": {
      "MCP_NETWORK": "igra-testnet",
      "MCP_WALLET_KEY": "${MCP_WALLET_KEY}"
    }
  }
}
```

## Networks

| Network | Name | Chain ID | Aliases |
|---------|------|----------|---------|
| IGRA Mainnet | `igra` | 38833 | `mainnet`, `igra-mainnet` |
| IGRA Testnet | `igra-testnet` | 38836 | `testnet`, `galleon` |
| Kasplex Mainnet | `kasplex` | 202555 | `kasplex-mainnet` |
| Kasplex Testnet | `kasplex-testnet` | 167012 | `kasplex-test` |

## Available Tools

### Read Tools (Phase 2 — Complete)

| Tool | Description |
|------|-------------|
| `getPairs` | List DEX liquidity pairs with reserves |
| `getTokenPrice` | Token price in USD via DEX pricing path |
| `getMarkets` | Aave lending markets: rates, TVL, utilization |
| `getPosition` | Wallet lending position + health factor |
| `getPortfolio` | Full portfolio: balances, LP positions, lending |
| `getActiveLaunches` | Active LFG Launchpad token launches |
| `getProtocolInfo` | Protocol overview: contracts, tokens, network |

### Write Tools (Phase 3 — Pending)

| Tool | Description |
|------|-------------|
| `swap` | Swap tokens via DEX router |
| `addLiquidity` | Add liquidity to DEX pair |
| `removeLiquidity` | Remove liquidity from DEX pair |
| `supply` | Supply tokens to Aave lending |
| `borrow` | Borrow tokens from Aave lending |
| `repay` | Repay borrowed tokens |
| `buyLaunchToken` | Buy tokens from LFG launch |
| `sellLaunchToken` | Sell/refund LFG launch tokens |

Write tools are registered in the MCP schema and CLI but return `not_implemented` until Phase 3. This lets agents discover the full API surface while only read operations execute.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MCP_NETWORK` | No | `igra` | Default network for all operations |
| `MCP_WALLET_KEY` | No | — | Private key for write operations (read-only without) |
| `MCP_HEALTH_PORT` | No | `3100` | Health endpoint port |

## Health Check

The MCP server exposes a health endpoint:

```bash
curl http://127.0.0.1:3100/
# {"status":"ok","server":"kaspacom-defi-mcp","version":"0.1.0","network":"igra",...}
```

## Gas Tips (IGRA)

IGRA mempool requires gas price **strictly above 2 gwei** (minimum: `2,000,000,001 wei`). `eth_estimateGas` is unreliable — the server uses static gas limits:

| Operation | Gas Limit |
|-----------|-----------|
| approve | 100,000 |
| swap | 350,000 |
| addLiquidity / removeLiquidity | 400,000 |
| supply / borrow / repay | 500,000 |

## Security

- **Use testnets first.** Default to `igra-testnet` or `kasplex-testnet` for development.
- **Never commit private keys.** Use environment variables only. The `.gitignore` blocks `.env` files.
- **Read-only mode is safe.** Omit `MCP_WALLET_KEY` for monitoring/analysis workflows.
- **Health factor safety.** When borrowing, keep health factor > 1.5. Below 1.0 = liquidation.

## Development

```bash
npm install
npm run build        # TypeScript compilation
npm test             # Vitest test suite
npm run test:watch   # Watch mode
```

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 — Foundation | Done | Network config, RPC client, ABI wrappers, MCP + CLI shells |
| Phase 2 — Read Tools | Done | DEX, lending, launchpad, portfolio, protocol info queries |
| Phase 3 — Write Tools | Next | Swap, liquidity, lending, launchpad write execution |
| Phase 4 — Hardening | Planned | Production safety, docs, broader integration polish |

## License

[MIT](./LICENSE)
