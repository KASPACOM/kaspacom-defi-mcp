# AGENTS.md — KaspaCom DeFi MCP Integration Guide

This guide helps AI agents (Claude, GPT, Codex, etc.) integrate with the KaspaCom DeFi MCP server to interact with DEX, Lending, and Launchpad protocols on the IGRA blockchain (Kaspa L2).

---

## Protocol Overview

KaspaCom DeFi runs on **IGRA** — a Kaspa Layer 2 EVM chain. Three protocols are accessible:

| Protocol | Type | Description |
|----------|------|-------------|
| **DEX** | Uniswap V2 fork | AMM-based token swaps, liquidity provision |
| **Lending** | Aave V3 fork | Overcollateralized supply/borrow/repay |
| **LFG Launchpad** | Token launch platform | Buy/sell tokens during launch phase |

**Networks:**
- `galleon` — Galleon Testnet (chainId 38836) — use this for testing
- `igra` — IGRA Mainnet (chainId 38833) — production

---

## Quick Start

### Read-only (no wallet needed)
```bash
# Get all DEX pairs
MCP_WALLET_KEY="" node dist/mcp/index.js
# then call: getPairs, getTokenPrice, getMarkets, getPosition, getActiveLaunches, getPortfolio, getProtocolInfo
```

### With a wallet (required for swaps, lending, launchpad buys)
```bash
MCP_WALLET_KEY="0xYOUR_PRIVATE_KEY" MCP_NETWORK="galleon" node dist/mcp/index.js
```

---

## Available Tools

### DEX Tools

#### `getPairs`
List all DEX liquidity pairs with reserves and token info.

**Input:**
```json
{
  "network": "galleon",
  "limit": 20
}
```

**Output:**
```json
[
  {
    "address": "0x...",
    "token0": { "symbol": "WKAS", "address": "0x...", "reserve": "1500000.5" },
    "token1": { "symbol": "USDC", "address": "0x...", "reserve": "750000.0" },
    "totalSupply": "1000.0"
  }
]
```

---

#### `getTokenPrice`
Get token price in USD or relative to another token.

**Input:**
```json
{
  "token": "WKAS",
  "quoteToken": "USDC",
  "network": "galleon"
}
```

**Output:**
```json
{
  "token": "WKAS",
  "price": "0.42",
  "quoteToken": "USDC",
  "source": "dex"
}
```

---

#### `swap`
Swap tokens via DEX router. **Requires wallet.**

**Input:**
```json
{
  "tokenIn": "USDC",
  "tokenOut": "WKAS",
  "amountIn": "100",
  "slippagePct": 0.5,
  "network": "galleon"
}
```

**Output:**
```json
{
  "txHash": "0x...",
  "amountIn": "100.0",
  "amountOut": "238.1",
  "tokenIn": "USDC",
  "tokenOut": "WKAS"
}
```

---

#### `addLiquidity`
Add tokens to a DEX pool to earn trading fees. **Requires wallet.**

**Input:**
```json
{
  "tokenA": "WKAS",
  "tokenB": "USDC",
  "amountA": "100",
  "amountB": "42",
  "slippagePct": 0.5
}
```

**Output:**
```json
{
  "txHash": "0x...",
  "amountA": "100.0",
  "amountB": "42.0",
  "lpTokens": "64.8"
}
```

---

#### `removeLiquidity`
Burn LP tokens to reclaim underlying assets. **Requires wallet.**

**Input:**
```json
{
  "tokenA": "WKAS",
  "tokenB": "USDC",
  "lpAmount": "64.8",
  "slippagePct": 0.5
}
```

---

### Lending Tools

#### `getMarkets`
List all Aave lending markets.

**Output:**
```json
[
  {
    "token": "USDC",
    "supplyAPY": "3.2%",
    "borrowAPY": "5.1%",
    "totalSupplied": "2500000.0",
    "totalBorrowed": "1800000.0",
    "utilization": "72%",
    "liquidationThreshold": "85%"
  }
]
```

---

#### `getPosition`
Get a wallet's current lending position and health factor.

**Input:**
```json
{
  "address": "0xYOUR_WALLET",
  "network": "galleon"
}
```

**Output:**
```json
{
  "totalCollateralUSD": "1000.0",
  "totalDebtUSD": "400.0",
  "availableBorrowsUSD": "350.0",
  "healthFactor": "2.12",
  "ltv": "40%"
}
```

---

#### `supply`
Supply tokens to earn interest and use as collateral. **Requires wallet.**

**Input:**
```json
{
  "token": "USDC",
  "amount": "500",
  "network": "galleon"
}
```

**Output:**
```json
{
  "txHash": "0x...",
  "token": "USDC",
  "amount": "500.0",
  "aToken": "0x..."
}
```

---

#### `borrow`
Borrow tokens against supplied collateral (variable rate). **Requires wallet.**

**Input:**
```json
{
  "token": "WKAS",
  "amount": "200",
  "network": "galleon"
}
```

**Output:**
```json
{
  "txHash": "0x...",
  "token": "WKAS",
  "amount": "200.0",
  "newHealthFactor": "1.85"
}
```

> ⚠️ Always check health factor after borrowing. Health factor < 1.0 = liquidation risk.

---

#### `repay`
Repay borrowed tokens to reduce debt. Use `amount: "max"` to repay all. **Requires wallet.**

**Input:**
```json
{
  "token": "WKAS",
  "amount": "max"
}
```

---

### Launchpad Tools

#### `getActiveLaunches`
List all active LFG Launchpad token launches.

**Output:**
```json
[
  {
    "id": "0x...",
    "tokenName": "ExampleToken",
    "tokenSymbol": "EXT",
    "pricePerToken": "0.01",
    "priceToken": "USDC",
    "totalRaise": "500000",
    "raisedSoFar": "123456",
    "progress": "24.7%",
    "endsAt": "2024-03-15T18:00:00Z"
  }
]
```

---

#### `buyLaunchToken`
Purchase tokens from an active launch. **Requires wallet.**

**Input:**
```json
{
  "launchId": "0xLAUNCH_CONTRACT_ADDRESS",
  "paymentToken": "USDC",
  "amount": "100"
}
```

---

#### `sellLaunchToken`
Sell/return launch tokens (if refund window is open). **Requires wallet.**

**Input:**
```json
{
  "launchId": "0xLAUNCH_CONTRACT_ADDRESS",
  "amount": "1000"
}
```

---

### Portfolio & Info Tools

#### `getPortfolio`
Full portfolio summary across DEX, lending, and balances.

**Input:**
```json
{
  "address": "0xYOUR_WALLET",
  "network": "galleon"
}
```

**Output:**
```json
{
  "address": "0x...",
  "totalValueUSD": "2750.0",
  "tokens": [
    { "symbol": "USDC", "balance": "500.0", "valueUSD": "500.0" },
    { "symbol": "WKAS", "balance": "1200.0", "valueUSD": "504.0" }
  ],
  "lpPositions": [],
  "lending": {
    "collateral": "500.0",
    "debt": "0.0",
    "healthFactor": "∞"
  }
}
```

---

#### `getProtocolInfo`
Protocol overview: contracts, tokens, network info.

**Output:**
```json
{
  "network": "galleon",
  "chainId": 38836,
  "rpc": "https://galleon-testnet.igralabs.com:8545",
  "contracts": {
    "dex": { "factory": "0x...", "router": "0x..." },
    "lending": { "pool": "0x..." }
  },
  "tokens": ["WKAS", "WBTC", "WETH", "DAI", "USDC", "USDT"]
}
```

---

## Example Workflows

### 1. "Supply USDC, borrow WKAS, swap to WETH"
```
1. supply { token: "USDC", amount: "500" }
2. getPosition → confirm healthFactor > 1.5
3. borrow { token: "WKAS", amount: "200" }
4. getPosition → confirm healthFactor > 1.3
5. swap { tokenIn: "WKAS", tokenOut: "WETH", amountIn: "200" }
```

### 2. "Provide liquidity to WKAS/USDC pool"
```
1. getTokenPrice { token: "WKAS" } → price is $0.42
2. To add $100 of liquidity:
   - amountA: "119" WKAS (≈ $50)
   - amountB: "50" USDC
3. addLiquidity { tokenA: "WKAS", tokenB: "USDC", amountA: "119", amountB: "50" }
4. getPairs → verify LP position
```

### 3. "Check portfolio before and after lending"
```
1. getPortfolio { address: "0x..." }
2. supply { token: "USDC", amount: "1000" }
3. borrow { token: "WKAS", amount: "500" }
4. getPortfolio { address: "0x..." } → compare
```

### 4. "Participate in LFG launch"
```
1. getActiveLaunches → find launch ID
2. getTokenPrice { token: "USDC" } → confirm payment token balance
3. buyLaunchToken { launchId: "0x...", paymentToken: "USDC", amount: "200" }
```

---

## Gas Tips for IGRA

| Operation | Gas Limit | Notes |
|-----------|-----------|-------|
| `approve` | 100,000 | Always needed before first DEX/lending operation |
| `swap` | 350,000 | Via Uniswap V2 Router |
| `addLiquidity` | 400,000 | Two-token deposits |
| `removeLiquidity` | 400,000 | Burns LP token |
| `supply` / `borrow` / `repay` | 500,000 | Aave V3 operations |

**Critical:** IGRA mempool requires gas price **strictly above 2 gwei** (minimum: `2,000,000,001 wei`). `eth_estimateGas` is unreliable — always use static limits above.

---

## Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kaspacom-defi": {
      "command": "node",
      "args": ["/path/to/kaspacom-defi-mcp/dist/mcp/index.js"],
      "env": {
        "MCP_NETWORK": "galleon",
        "MCP_WALLET_KEY": "0xYOUR_TESTNET_PRIVATE_KEY"
      }
    }
  }
}
```

---

## OpenClaw Config

Add to `/root/.openclaw/openclaw.json` under `plugins.mcp.servers`:

```json
{
  "kaspacom-defi": {
    "command": "node",
    "args": ["/home/coder/projects/kaspacom-defi-mcp/dist/mcp/index.js"],
    "env": {
      "MCP_NETWORK": "galleon",
      "MCP_WALLET_KEY": "${MCP_WALLET_KEY}"
    }
  }
}
```

Set `MCP_WALLET_KEY` in `/root/.openclaw/.env`.

---

## CLI Usage

```bash
# Install globally after build
npm run build
npm link

# Examples
kaspacom-defi getProtocolInfo --network galleon
kaspacom-defi getPairs --network galleon --json
kaspacom-defi getTokenPrice WKAS --quote USDC
kaspacom-defi getMarkets
kaspacom-defi getPortfolio 0xYOUR_ADDRESS

# Write operations require --wallet
kaspacom-defi swap --in USDC --out WKAS --amount 100 --wallet 0xKEY
kaspacom-defi supply --token USDC --amount 500 --wallet 0xKEY
kaspacom-defi borrow --token WKAS --amount 200 --wallet 0xKEY
```

---

## Security Notes

⚠️ **CRITICAL — READ BEFORE USING**

1. **Testnet only for now.** Use Galleon Testnet (`--network galleon`) during development. Mainnet keys should NEVER be used until the protocol is production-audited.

2. **Never put mainnet private keys in config files.** Use environment variables only:
   ```bash
   export MCP_WALLET_KEY="0x..."
   ```

3. **Never commit private keys to git.** The `.gitignore` blocks `.env`, but double-check before `git add`.

4. **Rotate keys if exposed.** If a private key appears in logs, commit history, or error messages — rotate it immediately.

5. **Testnet wallets only.** Keep a separate wallet with only testnet funds. Never reuse a wallet that holds real assets.

6. **Health factor safety.** When borrowing, maintain health factor > 1.5. Below 1.0 means liquidation.

7. **Read-only mode.** For monitoring/analysis workflows, omit `MCP_WALLET_KEY` entirely. All read tools work without a wallet.

---

## Health Check

The MCP server exposes a health endpoint at `http://127.0.0.1:3100/`:

```bash
curl http://127.0.0.1:3100/
# {"status":"ok","server":"kaspacom-defi-mcp","version":"0.1.0","network":"galleon",...}
```

---

## Status

| Phase | Status | Contents |
|-------|--------|----------|
| Phase 1 — Foundation | ✅ Complete | Network config, RPC client, ABI wrappers, MCP shell, CLI shell |
| Phase 2 — Implementations | 🔜 Pending | Full DEX, Lending, Launchpad tool logic |
| Phase 3 — Mainnet | 🔜 Pending | Mainnet contract addresses, production hardening |
