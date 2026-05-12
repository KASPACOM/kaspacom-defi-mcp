import type { NetworkConfig } from "../contracts.js";
import type { RpcClient } from "../rpc.js";
import { getFreshUserAccountData } from "./aaveAccountData.js";
import {
  formatAaveBase,
  formatPercent,
  formatRay,
  resolveWalletAddress,
  success,
  failure,
  type ToolResult,
} from "./shared.js";

export async function getPosition(
  params: Record<string, unknown>,
  network: NetworkConfig,
  rpcClient: RpcClient
): Promise<ToolResult> {
  if (!network.features.lending) {
    return failure(network, `Lending is not available on ${network.name}`);
  }

  const wallet = resolveWalletAddress(params);
  if (!wallet) {
    return failure(network, "getPosition requires an address parameter");
  }

  try {
    const accountData = await getFreshUserAccountData(network, rpcClient, wallet);

    return success(network, {
      address: wallet,
      totalCollateralBase: formatAaveBase(accountData.totalCollateralBase),
      totalDebtBase: formatAaveBase(accountData.totalDebtBase),
      availableBorrowsBase: formatAaveBase(accountData.availableBorrowsBase),
      currentLiquidationThreshold: formatPercent(Number(accountData.currentLiquidationThreshold) / 100),
      ltv: formatPercent(Number(accountData.ltv) / 100),
      healthFactor: formatRay(accountData.healthFactor),
      raw: {
        totalCollateralBase: accountData.totalCollateralBase.toString(),
        totalDebtBase: accountData.totalDebtBase.toString(),
        availableBorrowsBase: accountData.availableBorrowsBase.toString(),
        currentLiquidationThreshold: accountData.currentLiquidationThreshold.toString(),
        ltv: accountData.ltv.toString(),
        healthFactor: accountData.healthFactor.toString(),
      },
    });
  } catch (error: unknown) {
    return failure(network, `getPosition failed: ${String(error)}`);
  }
}
