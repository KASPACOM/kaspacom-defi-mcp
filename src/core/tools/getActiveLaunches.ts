import type { NetworkConfig } from "../contracts.js";
import type { RpcClient } from "../rpc.js";
import { formatDecimal, success, failure, type ToolResult } from "./shared.js";

const DEFI_API_BASE = "https://api-defi.kaspa.com";

interface LfgSearchResponse {
  success: boolean;
  result: LfgToken[];
}

interface LfgToken {
  tokenAddress: string;
  ticker: string;
  name: string;
  description?: string;
  totalSupply: number;
  image?: string;
  state: string;
  decimals: number;
  price: number;
  marketCap: number;
  progress: number;
  holderCount: number;
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  tradeCount?: { buys: number; sells: number };
  socials?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export async function getActiveLaunches(
  _params: Record<string, unknown>,
  network: NetworkConfig,
  _rpcClient: RpcClient
): Promise<ToolResult> {
  try {
    const apiNetwork = network.defiApiNetwork ?? network.launchpadApiNetwork;
    const url = `${DEFI_API_BASE}/explorer/lfg-tokens/search?network=${encodeURIComponent(apiNetwork)}&page=1&sortBy=Market+Cap+(High+to+Low)&view=grid`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as LfgSearchResponse;
    if (!data.success || !Array.isArray(data.result)) {
      return success(network, { count: 0, launches: [] });
    }

    const launches = data.result.map((token) => ({
      tokenAddress: token.tokenAddress,
      ticker: token.ticker,
      name: token.name,
      state: token.state,
      price: formatDecimal(token.price, 8),
      marketCap: formatDecimal(token.marketCap, 2),
      progress: formatDecimal(token.progress, 2),
      holderCount: token.holderCount,
      volume24h: formatDecimal(token.volume?.["1d"] ?? 0, 2),
      priceChange24h: formatDecimal(token.priceChange?.["1d"] ?? 0, 2),
      socials: token.socials,
      image: token.image
        ? `https://ipfs.lfg.kaspa.com/ipfs/${token.image}`
        : null,
      createdAt: token.createdAt,
    }));

    return success(network, {
      count: launches.length,
      launches,
    });
  } catch (error: unknown) {
    return failure(network, `getActiveLaunches failed: ${String(error)}`);
  }
}
