import type { NetworkConfig } from "../contracts.js";
import type { RpcClient } from "../rpc.js";
import { aavePool, erc20 } from "../typed-contracts.js";
import {
  apyFromRayRate,
  calculateUtilization,
  formatPercent,
  formatUnitsSafe,
  success,
  failure,
  type ToolResult,
} from "./shared.js";

export async function getMarkets(
  _params: Record<string, unknown>,
  network: NetworkConfig,
  rpcClient: RpcClient
): Promise<ToolResult> {
  if (!network.features.lending) {
    return failure(network, `Lending is not available on ${network.name}`);
  }

  try {
    const pool = aavePool(network.contracts.lending.pool);
    const markets = [] as Array<Record<string, unknown>>;

    for (const token of Object.values(network.tokens)) {
      try {
        const reserveDataHex = await rpcClient.ethCall(
          pool.address,
          pool.encodeGetReserveData(token.address)
        );
        const reserveData = pool.decodeGetReserveData(reserveDataHex);

        const currentLiquidityRate = BigInt(reserveData[2]);
        const currentVariableBorrowRate = BigInt(reserveData[4]);
        const aTokenAddress = String(reserveData[8]);
        const stableDebtTokenAddress = String(reserveData[9]);
        const variableDebtTokenAddress = String(reserveData[10]);

        const underlying = erc20(token.address);
        const stableDebtToken = erc20(stableDebtTokenAddress);
        const variableDebtToken = erc20(variableDebtTokenAddress);

        const [availableLiquidityHex, stableDebtSupplyHex, variableDebtSupplyHex] = await Promise.all([
          rpcClient.ethCall(token.address, underlying.encodeBalanceOf(aTokenAddress)),
          rpcClient.ethCall(stableDebtToken.address, stableDebtToken.encodeTotalSupply()),
          rpcClient.ethCall(variableDebtToken.address, variableDebtToken.encodeTotalSupply()),
        ]);

        const availableLiquidity = underlying.decodeBalanceOf(availableLiquidityHex);
        const stableDebt = stableDebtToken.decodeTotalSupply(stableDebtSupplyHex);
        const variableDebt = variableDebtToken.decodeTotalSupply(variableDebtSupplyHex);
        const totalBorrowed = stableDebt + variableDebt;
        const totalSupplied = availableLiquidity + totalBorrowed;
        const utilization = calculateUtilization(totalBorrowed, totalSupplied);

        markets.push({
          token: token.symbol,
          address: token.address,
          apy: formatPercent(apyFromRayRate(currentLiquidityRate)),
          borrowApy: formatPercent(apyFromRayRate(currentVariableBorrowRate)),
          utilization: formatPercent(utilization),
          availableLiquidity: formatUnitsSafe(availableLiquidity, token.decimals),
          totalSupplied: formatUnitsSafe(totalSupplied, token.decimals),
          totalBorrowed: formatUnitsSafe(totalBorrowed, token.decimals),
          availableLiquidityRaw: availableLiquidity.toString(),
          totalSuppliedRaw: totalSupplied.toString(),
          totalBorrowedRaw: totalBorrowed.toString(),
          liquidityRateRaw: currentLiquidityRate.toString(),
          variableBorrowRateRaw: currentVariableBorrowRate.toString(),
        });
      } catch {
        // Token not listed in Aave pool — skip silently
      }
    }

    return success(network, {
      count: markets.length,
      markets,
    });
  } catch (error: unknown) {
    return failure(network, `getMarkets failed: ${String(error)}`);
  }
}
