import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IGRA_TESTNET } from "../src/core/contracts.js";
import { RpcCallError } from "../src/core/rpc.js";
import {
  AAVE_POOL_IFACE,
  UI_DATA_PROVIDER_WRAPPER_IFACE,
} from "../src/core/typed-contracts.js";
import {
  fetchKaskadPriceUpdates,
  getFreshUserAccountData,
} from "../src/core/tools/aaveAccountData.js";

const WALLET = "0x1111111111111111111111111111111111111111";
const ASSET_ID = "0x" + "aa".repeat(32);

function createRpcStub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ethCall: vi.fn(),
    ...overrides,
  };
}

function stubKaskadPrices(prices: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ prices }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
  );
}

function validKaskadPrice() {
  return {
    asset_id: ASSET_ID,
    price: "100000000",
    timestamp: "1710000000",
    num_sources: 1,
    sources_hash: "0x" + "bb".repeat(32),
    signature: "0x1234",
  };
}

describe("Aave account data Kaskad wrapper reads", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects empty Kaskad price arrays before calling the wrapper", async () => {
    stubKaskadPrices([]);
    const rpc = createRpcStub();

    await expect(getFreshUserAccountData(IGRA_TESTNET, rpc as never, WALLET)).rejects.toThrow(
      "Kaskad relayer response prices array is empty; refusing to call UiDataProviderWrapper without price updates"
    );
    expect(rpc.ethCall).not.toHaveBeenCalled();
  });

  it("fetchKaskadPriceUpdates rejects empty price arrays with a clear error", async () => {
    stubKaskadPrices([]);

    await expect(fetchKaskadPriceUpdates("https://oracle.example")).rejects.toThrow(
      "Kaskad relayer response prices array is empty; refusing to call UiDataProviderWrapper without price updates"
    );
  });

  it("decodes ResultData only when the revert selector matches ResultData", async () => {
    stubKaskadPrices([validKaskadPrice()]);
    const accountData = AAVE_POOL_IFACE.encodeFunctionResult("getUserAccountData", [
      1n,
      2n,
      3n,
      4n,
      5n,
      6n,
    ]);
    const revertData = UI_DATA_PROVIDER_WRAPPER_IFACE.encodeErrorResult("ResultData", [accountData]);
    const rpc = createRpcStub({
      ethCall: vi.fn().mockRejectedValue(new RpcCallError(-32000, "execution reverted", revertData)),
    });

    const result = await getFreshUserAccountData(IGRA_TESTNET, rpc as never, WALLET);

    expect(result).toEqual({
      totalCollateralBase: 1n,
      totalDebtBase: 2n,
      availableBorrowsBase: 3n,
      currentLiquidationThreshold: 4n,
      ltv: 5n,
      healthFactor: 6n,
    });
  });

  it("surfaces actionable messages for known PriceUpdateFailed wrapper errors", async () => {
    stubKaskadPrices([validKaskadPrice()]);
    const revertData = UI_DATA_PROVIDER_WRAPPER_IFACE.encodeErrorResult("PriceUpdateFailed", [
      ASSET_ID,
      "0xdeadbeef",
    ]);
    const rpc = createRpcStub({
      ethCall: vi.fn().mockRejectedValue(new RpcCallError(-32000, "execution reverted", revertData)),
    });

    await expect(getFreshUserAccountData(IGRA_TESTNET, rpc as never, WALLET)).rejects.toThrow(
      `UiDataProviderWrapper Kaskad price update failed for asset ${ASSET_ID}; refresh/retry the Kaskad relayer price bundle. Underlying revert data: 0xdeadbeef`
    );
  });

  it("rethrows unknown non-ResultData RpcCallError unchanged", async () => {
    stubKaskadPrices([validKaskadPrice()]);
    const error = new RpcCallError(-32000, "execution reverted", "0x12345678");
    const rpc = createRpcStub({
      ethCall: vi.fn().mockRejectedValue(error),
    });

    await expect(getFreshUserAccountData(IGRA_TESTNET, rpc as never, WALLET)).rejects.toBe(error);
  });
});
