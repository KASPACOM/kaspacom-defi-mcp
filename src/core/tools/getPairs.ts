import type { NetworkConfig } from "../contracts.js";
import type { RpcClient } from "../rpc.js";
import { getDexSubgraphEndpoint, querySubgraph } from "../subgraph.js";
import { formatDecimal, success, failure, type ToolResult } from "./shared.js";

interface PairNode {
  id: string;
  token0: { id: string; symbol: string; name: string; decimals: string; derivedKAS?: string; derivedETH?: string };
  token1: { id: string; symbol: string; name: string; decimals: string; derivedKAS?: string; derivedETH?: string };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  reserveKAS?: string;
  reserveETH?: string;
  token0Price: string;
  token1Price: string;
  volumeKAS?: string;
  volumeUSD?: string;
  txCount: string;
}

interface PairsResponse {
  pairs: PairNode[];
}

function buildPairsQuery(variant: "kas" | "eth"): string {
  const reserveField = variant === "kas" ? "reserveKAS" : "reserveETH";
  const volumeField = variant === "kas" ? "volumeKAS" : "volumeUSD";
  const derivedField = variant === "kas" ? "derivedKAS" : "derivedETH";

  return `
{
  pairs(first: 100, orderBy: ${reserveField}, orderDirection: desc) {
    id
    token0 { id symbol name decimals ${derivedField} }
    token1 { id symbol name decimals ${derivedField} }
    reserve0
    reserve1
    totalSupply
    ${reserveField}
    token0Price
    token1Price
    ${volumeField}
    txCount
  }
}`;
}

export async function getPairs(
  params: Record<string, unknown>,
  network: NetworkConfig,
  _rpcClient: RpcClient
): Promise<ToolResult> {
  try {
    const rawLimit = typeof params.limit === "number" ? params.limit : Number(params.limit ?? 20);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 20;
    const endpoint = getDexSubgraphEndpoint(network);
    const variant = network.subgraphSchemaVariant;
    const query = buildPairsQuery(variant);
    const data = await querySubgraph<PairsResponse>(endpoint, query);

    return success(network, {
      endpoint,
      total: data.pairs.length,
      pairs: data.pairs.slice(0, limit).map((pair) => ({
        address: pair.id,
        token0: {
          address: pair.token0.id,
          symbol: pair.token0.symbol,
          name: pair.token0.name,
          decimals: Number(pair.token0.decimals),
          reserve: formatDecimal(Number(pair.reserve0)),
          priceInToken1: formatDecimal(Number(pair.token1Price)),
        },
        token1: {
          address: pair.token1.id,
          symbol: pair.token1.symbol,
          name: pair.token1.name,
          decimals: Number(pair.token1.decimals),
          reserve: formatDecimal(Number(pair.reserve1)),
          priceInToken0: formatDecimal(Number(pair.token0Price)),
        },
        totalSupply: formatDecimal(Number(pair.totalSupply)),
        reserveKAS: formatDecimal(Number(pair.reserveKAS ?? pair.reserveETH ?? 0), 2),
        volume: formatDecimal(Number(pair.volumeKAS ?? pair.volumeUSD ?? 0), 2),
        txCount: pair.txCount,
      })),
    });
  } catch (error: unknown) {
    return failure(network, `getPairs failed: ${String(error)}`);
  }
}
