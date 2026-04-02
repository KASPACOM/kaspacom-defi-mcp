import type { NetworkConfig } from "../contracts.js";
import { getTokenByAddress, requireToken } from "../contracts.js";
import type { RpcClient } from "../rpc.js";
import { getDexSubgraphEndpoint, querySubgraph } from "../subgraph.js";
import { STABLE_SYMBOLS, formatDecimal, success, failure, type ToolResult } from "./shared.js";

interface PricePairResponse {
  pairs: Array<{
    token0: { id: string; symbol: string };
    token1: { id: string; symbol: string };
    token0Price: string;
    token1Price: string;
    reserveUSD: string;
  }>;
}

const PRICE_QUERY = `
query TokenPrice($address: String!) {
  pairs(
    where: {or: [{token0: $address}, {token1: $address}]},
    orderBy: reserveUSD,
    orderDirection: desc,
    first: 1
  ) {
    token0 { id symbol }
    token1 { id symbol }
    token0Price
    token1Price
    reserveUSD
  }
}`;

async function resolveUsdPrice(
  network: NetworkConfig,
  address: string,
  visited = new Set<string>()
): Promise<{
  token: string;
  address: string;
  priceUsd: number;
  pairLiquidityUsd: number;
  sourcePair: { token0: string; token1: string };
}> {
  const normalizedAddress = address.toLowerCase();
  if (visited.has(normalizedAddress)) {
    throw new Error(`Price recursion detected for ${address}`);
  }
  visited.add(normalizedAddress);

  const endpoint = getDexSubgraphEndpoint(network);
  const data = await querySubgraph<PricePairResponse>(endpoint, PRICE_QUERY, {
    address: normalizedAddress,
  });

  const pair = data.pairs[0];
  if (!pair) {
    throw new Error(`No liquidity pair found for token ${address} on ${network.name}`);
  }

  const token0 = getTokenByAddress(network, pair.token0.id) ?? {
    symbol: pair.token0.symbol,
    address: pair.token0.id,
    decimals: 18,
  };
  const token1 = getTokenByAddress(network, pair.token1.id) ?? {
    symbol: pair.token1.symbol,
    address: pair.token1.id,
    decimals: 18,
  };

  const queryingTokenIs0 = pair.token0.id.toLowerCase() === normalizedAddress;
  const counterpart = queryingTokenIs0 ? token1 : token0;
  const relativePrice = queryingTokenIs0
    ? Number(pair.token0Price)
    : Number(pair.token1Price);

  let counterpartUsd = 0;
  if (STABLE_SYMBOLS.has(counterpart.symbol.toUpperCase())) {
    counterpartUsd = 1;
  } else {
    counterpartUsd = (
      await resolveUsdPrice(network, counterpart.address, visited)
    ).priceUsd;
  }

  return {
    token: queryingTokenIs0 ? token0.symbol : token1.symbol,
    address,
    priceUsd: relativePrice * counterpartUsd,
    pairLiquidityUsd: Number(pair.reserveUSD),
    sourcePair: {
      token0: token0.symbol,
      token1: token1.symbol,
    },
  };
}

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

    const token = requireToken(network, inputToken);
    const price = await resolveUsdPrice(network, token.address);

    return success(network, {
      token: token.symbol,
      address: token.address,
      priceUsd: formatDecimal(price.priceUsd, 8),
      pairLiquidityUsd: formatDecimal(price.pairLiquidityUsd, 2),
      source: "subgraph",
      sourcePair: price.sourcePair,
    });
  } catch (error: unknown) {
    return failure(network, `getTokenPrice failed: ${String(error)}`);
  }
}
