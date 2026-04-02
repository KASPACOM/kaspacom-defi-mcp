#!/usr/bin/env node
/**
 * KaspaCom DeFi MCP Server
 *
 * Phase 1: Shell with all 15 tools registered (implementations in Phase 2)
 * - Reads MCP_WALLET_KEY from env (optional for read-only tools)
 * - Exposes HTTP health endpoint on port 3100
 * - Connects via stdio transport (standard MCP)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as http from "http";
import { getNetwork } from "../core/contracts.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const SERVER_NAME = "kaspacom-defi-mcp";
const SERVER_VERSION = "0.1.0";
const HEALTH_PORT = parseInt(process.env.MCP_HEALTH_PORT ?? "3100", 10);

const walletKey = process.env.MCP_WALLET_KEY;
const networkName = process.env.MCP_NETWORK ?? "galleon";

// Validate network on startup
const network = getNetwork(networkName);

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  // ── DEX ─────────────────────────────────────────────────────────────────────
  {
    name: "getPairs",
    description:
      "List all DEX liquidity pairs. Returns pair addresses, token symbols, and reserve amounts.",
    inputSchema: {
      type: "object",
      properties: {
        network: {
          type: "string",
          description: "Network name: 'galleon' (testnet) or 'igra' (mainnet). Default: galleon.",
        },
        limit: {
          type: "number",
          description: "Max number of pairs to return. Default: 20.",
        },
      },
    },
  },
  {
    name: "getTokenPrice",
    description:
      "Get the current price of a token in USD (via Aave oracle) or relative to another token (via DEX reserves).",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token symbol, e.g. WKAS, USDC, WETH",
        },
        quoteToken: {
          type: "string",
          description: "Quote token symbol. Defaults to USDC.",
        },
        network: { type: "string" },
      },
      required: ["token"],
    },
  },
  {
    name: "swap",
    description:
      "Swap tokens via the DEX router. Requires MCP_WALLET_KEY to be set. Returns tx hash and amounts.",
    inputSchema: {
      type: "object",
      properties: {
        tokenIn: {
          type: "string",
          description: "Input token symbol, e.g. USDC",
        },
        tokenOut: {
          type: "string",
          description: "Output token symbol, e.g. WKAS",
        },
        amountIn: {
          type: "string",
          description: "Human-readable amount to swap, e.g. '100' for 100 USDC",
        },
        slippagePct: {
          type: "number",
          description: "Slippage tolerance in percent. Default: 0.5",
        },
        network: { type: "string" },
      },
      required: ["tokenIn", "tokenOut", "amountIn"],
    },
  },
  {
    name: "addLiquidity",
    description:
      "Add liquidity to a DEX pair. Requires MCP_WALLET_KEY. Returns tx hash and LP tokens received.",
    inputSchema: {
      type: "object",
      properties: {
        tokenA: { type: "string", description: "First token symbol" },
        tokenB: { type: "string", description: "Second token symbol" },
        amountA: { type: "string", description: "Amount of tokenA to add" },
        amountB: { type: "string", description: "Amount of tokenB to add" },
        slippagePct: { type: "number", description: "Slippage %. Default: 0.5" },
        network: { type: "string" },
      },
      required: ["tokenA", "tokenB", "amountA", "amountB"],
    },
  },
  {
    name: "removeLiquidity",
    description:
      "Remove liquidity from a DEX pair. Requires MCP_WALLET_KEY. Returns tx hash and tokens received.",
    inputSchema: {
      type: "object",
      properties: {
        tokenA: { type: "string" },
        tokenB: { type: "string" },
        lpAmount: {
          type: "string",
          description: "Amount of LP tokens to burn",
        },
        slippagePct: { type: "number" },
        network: { type: "string" },
      },
      required: ["tokenA", "tokenB", "lpAmount"],
    },
  },
  // ── Lending ──────────────────────────────────────────────────────────────────
  {
    name: "getMarkets",
    description:
      "List all Aave lending markets: supply/borrow rates, TVL, utilization, liquidation threshold.",
    inputSchema: {
      type: "object",
      properties: {
        network: { type: "string" },
      },
    },
  },
  {
    name: "getPosition",
    description:
      "Get a wallet's current lending position: supplied assets, borrowed assets, health factor.",
    inputSchema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description:
            "Wallet address to query. Defaults to MCP_WALLET_KEY address if set.",
        },
        network: { type: "string" },
      },
    },
  },
  {
    name: "supply",
    description:
      "Supply (deposit) tokens to the Aave lending pool. Requires MCP_WALLET_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", description: "Token symbol, e.g. USDC" },
        amount: {
          type: "string",
          description: "Human-readable amount to supply",
        },
        network: { type: "string" },
      },
      required: ["token", "amount"],
    },
  },
  {
    name: "borrow",
    description:
      "Borrow tokens from the Aave lending pool (variable rate). Requires MCP_WALLET_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        amount: { type: "string" },
        network: { type: "string" },
      },
      required: ["token", "amount"],
    },
  },
  {
    name: "repay",
    description:
      "Repay borrowed tokens to the Aave lending pool. Requires MCP_WALLET_KEY. Use amount='max' to repay all.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        amount: {
          type: "string",
          description: "Amount to repay, or 'max' for full repayment",
        },
        network: { type: "string" },
      },
      required: ["token", "amount"],
    },
  },
  // ── LFG Launchpad ────────────────────────────────────────────────────────────
  {
    name: "getActiveLaunches",
    description:
      "List all active LFG Launchpad token launches with pricing, progress, and time remaining.",
    inputSchema: {
      type: "object",
      properties: {
        network: { type: "string" },
      },
    },
  },
  {
    name: "buyLaunchToken",
    description:
      "Buy tokens from an LFG Launchpad launch. Requires MCP_WALLET_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        launchId: {
          type: "string",
          description: "Launch contract address or ID",
        },
        paymentToken: {
          type: "string",
          description: "Token to pay with (e.g. USDC, WKAS)",
        },
        amount: {
          type: "string",
          description: "Amount of payment token to spend",
        },
        network: { type: "string" },
      },
      required: ["launchId", "paymentToken", "amount"],
    },
  },
  {
    name: "sellLaunchToken",
    description:
      "Sell/return tokens from an LFG Launchpad launch (if refund window is open). Requires MCP_WALLET_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        launchId: { type: "string" },
        amount: {
          type: "string",
          description: "Amount of launch tokens to sell back",
        },
        network: { type: "string" },
      },
      required: ["launchId", "amount"],
    },
  },
  // ── Portfolio ────────────────────────────────────────────────────────────────
  {
    name: "getPortfolio",
    description:
      "Get a complete portfolio summary: token balances, LP positions, lending positions, total value.",
    inputSchema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description:
            "Wallet address. Defaults to MCP_WALLET_KEY address if set.",
        },
        network: { type: "string" },
      },
    },
  },
  // ── Info ─────────────────────────────────────────────────────────────────────
  {
    name: "getProtocolInfo",
    description:
      "Get protocol overview: contract addresses, supported tokens, network info, and current block.",
    inputSchema: {
      type: "object",
      properties: {
        network: { type: "string" },
      },
    },
  },
] as const;

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS as unknown as typeof TOOLS[number][] };
});

// Call tool handler — Phase 1 stubs
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Resolve network from args or env
  const netName = (args as Record<string, unknown>)?.network as string | undefined
    ?? networkName;
  const net = getNetwork(netName);

  // Write operations require a wallet key
  const writeOps = new Set(["swap", "addLiquidity", "removeLiquidity", "supply", "borrow", "repay", "buyLaunchToken", "sellLaunchToken"]);
  if (writeOps.has(name) && !walletKey) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: `Tool "${name}" requires a wallet. Set MCP_WALLET_KEY environment variable.`,
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }

  // Phase 1: Return structured placeholder for all tools
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          tool: name,
          network: net.name,
          chainId: net.chainId,
          status: "not_implemented",
          message: `Tool "${name}" is registered but not yet implemented. Phase 2 will add full execution logic.`,
          args,
        }, null, 2),
      },
    ],
  };
});

// ─── Health endpoint (HTTP) ───────────────────────────────────────────────────

function startHealthServer(): http.Server {
  const httpServer = http.createServer((_req, res) => {
    const health = {
      status: "ok",
      server: SERVER_NAME,
      version: SERVER_VERSION,
      network: network.name,
      chainId: network.chainId,
      tools: TOOLS.length,
      walletLoaded: !!walletKey,
      timestamp: new Date().toISOString(),
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(health));
  });

  httpServer.listen(HEALTH_PORT, "127.0.0.1", () => {
    process.stderr.write(
      `[kaspacom-defi-mcp] Health endpoint: http://127.0.0.1:${HEALTH_PORT}/\n`
    );
  });

  return httpServer;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  process.stderr.write(
    `[kaspacom-defi-mcp] Starting MCP server v${SERVER_VERSION} on network: ${network.name} (chainId: ${network.chainId})\n`
  );

  if (!walletKey) {
    process.stderr.write(
      "[kaspacom-defi-mcp] MCP_WALLET_KEY not set — running in read-only mode\n"
    );
  }

  // Start health endpoint
  startHealthServer();

  // Connect MCP via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write("[kaspacom-defi-mcp] MCP server ready\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`[kaspacom-defi-mcp] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
