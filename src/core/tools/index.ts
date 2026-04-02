import type { NetworkConfig } from "../contracts.js";
import { createRpcClient, type RpcClient } from "../rpc.js";
import { getActiveLaunches } from "./getActiveLaunches.js";
import { getMarkets } from "./getMarkets.js";
import { getPairs } from "./getPairs.js";
import { getPortfolio } from "./getPortfolio.js";
import { getPosition } from "./getPosition.js";
import { getProtocolInfo } from "./getProtocolInfo.js";
import { getTokenPrice } from "./getTokenPrice.js";
import type { ToolResult } from "./shared.js";

export type ReadToolHandler = (
  params: Record<string, unknown>,
  network: NetworkConfig,
  rpcClient: RpcClient
) => Promise<ToolResult>;

export const READ_TOOLS: Record<string, ReadToolHandler> = {
  getProtocolInfo,
  getPairs,
  getTokenPrice,
  getMarkets,
  getPosition,
  getActiveLaunches,
  getPortfolio,
};

export async function executeReadTool(
  name: string,
  params: Record<string, unknown>,
  network: NetworkConfig
): Promise<ToolResult | null> {
  const tool = READ_TOOLS[name];
  if (!tool) return null;
  const rpcClient = createRpcClient(network.rpc);
  return tool(params, network, rpcClient);
}

export {
  getProtocolInfo,
  getPairs,
  getTokenPrice,
  getMarkets,
  getPosition,
  getActiveLaunches,
  getPortfolio,
};
