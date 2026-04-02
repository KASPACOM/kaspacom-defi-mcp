import { listNetworks, type NetworkConfig } from "../contracts.js";
import type { RpcClient } from "../rpc.js";
import { getAgentsGuide, getGasTips, success, failure, type ToolResult } from "./shared.js";

export async function getProtocolInfo(
  _params: Record<string, unknown>,
  network: NetworkConfig,
  rpcClient: RpcClient
): Promise<ToolResult> {
  try {
    const [blockNumber, chainId] = await Promise.all([
      rpcClient.getBlockNumber(),
      rpcClient.getChainId(),
    ]);

    const networks = listNetworks().map((item) => ({
      name: item.name,
      chainId: item.chainId,
      rpc: item.rpc,
      explorer: item.explorer,
      subgraphUrl: item.subgraphUrl,
      features: item.features,
      contracts: item.contracts,
      verifiedTokens: Object.values(item.tokens),
    }));

    return success(network, {
      currentNetwork: network.name,
      currentChainId: network.chainId,
      rpcChainId: chainId.toString(),
      currentBlock: blockNumber.toString(),
      gasTips: getGasTips(),
      networks,
      agentsGuide: getAgentsGuide(),
    });
  } catch (error: unknown) {
    return failure(network, `getProtocolInfo failed: ${String(error)}`);
  }
}
