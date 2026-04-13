import type { NetworkConfig } from "../contracts.js";
import { getToken, getTokenByAddress } from "../contracts.js";
import type { RpcClient } from "../rpc.js";
import { getDexSubgraphEndpoint, querySubgraph } from "../subgraph.js";
import { formatDecimal, success, failure, type ToolResult } from "./shared.js";

// ─── api-defi token list (prod networks only) ────────────────────────────────

const DEFI_API_BASE = "https://api-defi.kaspa.com";

interface DefiApiToken {
  id: string;
  symbol: string;
  name: string;
  decimals: string;
  tokenPriceUSD: number;
  marketCapUSD: number;
  logoURI?: string;
}

interface DefiApiTokensResponse {
  tokens: DefiApiToken[];
  pagination: { first: number; skip: number; count: number; total: number };
}

async function fetchPriceFromDefiApi(
  network: NetworkConfig,
  tokenAddress: string,
): Promise<{ priceUsd: number; marketCapUsd: number; source: string } | null> {
  if (!network.defiApiNetwork) return null;

  try {
    const url = `${DEFI_API_BASE}/tokens?network=${encodeURIComponent(network.defiApiNetwork)}&first=500`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as DefiApiTokensResponse;
    const normalizedAddress = tokenAddress.toLowerCase();
    const token = data.tokens.find((t) => t.id.toLowerCase() === normalizedAddress);
    if (!token || token.tokenPriceUSD === 0) return null;

    return {
      priceUsd: token.tokenPriceUSD,
      marketCapUsd: token.marketCapUSD,
      source: "api-defi",
    };
  } catch {
    return null;
  }
}

// ─── Subgraph derivedKAS fallback ─────────────────────────────────────────────

interface TokenSubgraphResponse {
  tokens: Array<{
    id: string;
    symbol: string;
    derivedKAS?: string;
    derivedETH?: string;
  }>;
}

async function fetchPriceFromSubgraph(
  network: NetworkConfig,
  tokenAddress: string,
): Promise<{ priceInKas: number; source: string } | null> {
  try {
    const endpoint = getDexSubgraphEndpoint(network);
    const derivedField = network.subgraphSchemaVariant === "kas" ? "derivedKAS" : "derivedETH";

    const query = `
      query TokenDerived($address: String!) {
        tokens(where: {id: $address}, first: 1) {
          id
          symbol
          ${derivedField}
        }
      }`;

    const data = await querySubgraph<TokenSubgraphResponse>(endpoint, query, {
      address: tokenAddress.toLowerCase(),
    });

    const token = data.tokens[0];
    if (!token) return null;

    const derivedValue = Number(token.derivedKAS ?? token.derivedETH ?? 0);
    if (derivedValue === 0) return null;

    return {
      priceInKas: derivedValue,
      source: "subgraph",
    };
  } catch {
    return null;
  }
}

// ─── Main tool ────────────────────────────────────────────────────────────────

export async function getTokenPrice(
  params: Record<string, unknown>,
  network: NetworkConfig,
  _rpcClient: RpcClient
): Promise<ToolResult> {
  try {
    const inputToken = params.token;
    if (typeof inputToken !== "string" || !inputToken.trim()) {
      return failure(network, "getTokenPrice requires a token symbol");
    }

    // Look up token in registry; also try case-insensitive match
    const token = getToken(network, inputToken);
    if (!token) {
      return failure(
        network,
        `Token "${inputToken}" not found on ${network.name}. Available: ${Object.keys(network.tokens).join(", ")}`,
      );
    }

    // Try api-defi first (has direct USD prices for prod networks)
    const apiPrice = await fetchPriceFromDefiApi(network, token.address);
    if (apiPrice) {
      return success(network, {
        token: token.symbol,
        address: token.address,
        priceUsd: formatDecimal(apiPrice.priceUsd, 8),
        marketCapUsd: formatDecimal(apiPrice.marketCapUsd, 2),
        source: apiPrice.source,
      });
    }

    // Fall back to subgraph derivedKAS
    const subgraphPrice = await fetchPriceFromSubgraph(network, token.address);
    if (subgraphPrice) {
      return success(network, {
        token: token.symbol,
        address: token.address,
        priceInKas: formatDecimal(subgraphPrice.priceInKas, 8),
        priceUsd: null,
        note: "USD price not available on this network. Price shown in KAS.",
        source: subgraphPrice.source,
      });
    }

    return failure(
      network,
      `No price data found for ${token.symbol} on ${network.name}. Token may not have any DEX liquidity.`,
    );
  } catch (error: unknown) {
    return failure(network, `getTokenPrice failed: ${String(error)}`);
  }
}
