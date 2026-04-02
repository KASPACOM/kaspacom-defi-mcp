import type { NetworkConfig } from "../contracts.js";
import type { RpcClient } from "../rpc.js";
import { formatDecimal, success, failure, type ToolResult } from "./shared.js";

export async function getActiveLaunches(
  _params: Record<string, unknown>,
  network: NetworkConfig,
  _rpcClient: RpcClient
): Promise<ToolResult> {
  try {
    const url = `https://api-defi.kaspa.com/lfg/tokens?status=active&network=${encodeURIComponent(network.name)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = (await response.json()) as unknown;
    const launches = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : [];

    const mapped = launches.map((item) => {
      const launch = item as Record<string, unknown>;
      return {
        tokenName: String(launch.tokenName ?? launch.name ?? "Unknown"),
        symbol: String(launch.symbol ?? launch.tokenSymbol ?? ""),
        address: String(launch.address ?? launch.tokenAddress ?? launch.id ?? ""),
        bondingCurveProgress: formatDecimal(Number(launch.bondingCurveProgress ?? launch.progress ?? 0), 2),
        currentPrice: formatDecimal(Number(launch.currentPrice ?? launch.price ?? 0), 8),
        marketCap: formatDecimal(Number(launch.marketCap ?? 0), 2),
        raw: launch,
      };
    });

    return success(network, {
      count: mapped.length,
      launches: mapped,
    });
  } catch (error: unknown) {
    return failure(network, `getActiveLaunches failed: ${String(error)}`);
  }
}
