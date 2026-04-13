import type { NetworkConfig } from "../contracts.js";
import type { RpcClient } from "../rpc.js";
import { aavePool, erc20 } from "../typed-contracts.js";
import { getTokenPrice } from "./getTokenPrice.js";
import {
  formatAaveBase,
  formatDecimal,
  formatRay,
  formatUnitsSafe,
  resolveWalletAddress,
  success,
  failure,
  type ToolResult,
} from "./shared.js";

export async function getPortfolio(
  params: Record<string, unknown>,
  network: NetworkConfig,
  rpcClient: RpcClient
): Promise<ToolResult> {
  const wallet = resolveWalletAddress(params);
  if (!wallet) {
    return failure(network, "getPortfolio requires an address parameter");
  }

  try {
    const nativeBalance = await rpcClient.getBalance(wallet);
    const tokenEntries = await Promise.all(
      Object.values(network.tokens).map(async (token) => {
        const contract = erc20(token.address);
        const balanceHex = await rpcClient.ethCall(
          contract.address,
          contract.encodeBalanceOf(wallet)
        );
        const balance = contract.decodeBalanceOf(balanceHex);

        let priceUsd: number | null = null;
        const priceResult = await getTokenPrice({ token: token.symbol }, network, rpcClient);
        if (priceResult.ok && priceResult.data && typeof priceResult.data === "object") {
          const parsed = Number((priceResult.data as { priceUsd?: string }).priceUsd ?? 0);
          priceUsd = Number.isFinite(parsed) ? parsed : null;
        }

        const balanceFormatted = formatUnitsSafe(balance, token.decimals);
        const valueUsd = priceUsd !== null
          ? Number(balanceFormatted) * priceUsd
          : null;

        return {
          symbol: token.symbol,
          address: token.address,
          balance: balanceFormatted,
          balanceRaw: balance.toString(),
          priceUsd: priceUsd !== null ? formatDecimal(priceUsd, 8) : null,
          valueUsd: valueUsd !== null ? formatDecimal(valueUsd, 2) : null,
        };
      })
    );

    // Use the correct wrapped KAS symbol for this network (WiKAS on IGRA mainnet, WKAS elsewhere)
    const wrappedKasSymbol = Object.keys(network.tokens).find(
      (s) => s.toUpperCase() === "WKAS" || s.toUpperCase() === "WIKAS"
    ) ?? "WKAS";
    const nativePrice = await getTokenPrice({ token: wrappedKasSymbol }, network, rpcClient);
    const nativePriceUsd = nativePrice.ok && nativePrice.data && typeof nativePrice.data === "object"
      ? Number((nativePrice.data as { priceUsd?: string }).priceUsd ?? 0)
      : null;
    const nativeBalanceFormatted = formatUnitsSafe(nativeBalance, 18);
    const nativeValueUsd = nativePriceUsd !== null
      ? Number(nativeBalanceFormatted) * nativePriceUsd
      : null;

    let lending: Record<string, unknown> | null = null;
    let lendingNetUsd = 0;

    if (network.features.lending) {
      const pool = aavePool(network.contracts.lending.pool);
      const accountDataHex = await rpcClient.ethCall(
        pool.address,
        pool.encodeGetUserAccountData(wallet)
      );
      const accountData = pool.decodeGetUserAccountData(accountDataHex);
      const collateral = Number(formatAaveBase(accountData.totalCollateralBase));
      const debt = Number(formatAaveBase(accountData.totalDebtBase));
      lendingNetUsd = collateral - debt;

      lending = {
        totalCollateralBase: formatAaveBase(accountData.totalCollateralBase),
        totalDebtBase: formatAaveBase(accountData.totalDebtBase),
        availableBorrowsBase: formatAaveBase(accountData.availableBorrowsBase),
        ltv: formatDecimal(Number(accountData.ltv) / 100, 2),
        healthFactor: formatRay(accountData.healthFactor),
      };
    }

    const spotUsd = tokenEntries.reduce((sum, token) => sum + Number(token.valueUsd ?? 0), 0)
      + Number(nativeValueUsd ?? 0);

    return success(network, {
      address: wallet,
      native: {
        symbol: "KAS",
        balance: nativeBalanceFormatted,
        balanceRaw: nativeBalance.toString(),
        priceUsd: nativePriceUsd !== null ? formatDecimal(nativePriceUsd, 8) : null,
        valueUsd: nativeValueUsd !== null ? formatDecimal(nativeValueUsd, 2) : null,
      },
      tokens: tokenEntries,
      lending,
      totals: {
        spotValueUsd: formatDecimal(spotUsd, 2),
        lendingNetUsd: formatDecimal(lendingNetUsd, 2),
        aggregateUsd: formatDecimal(spotUsd + lendingNetUsd, 2),
      },
    });
  } catch (error: unknown) {
    return failure(network, `getPortfolio failed: ${String(error)}`);
  }
}
