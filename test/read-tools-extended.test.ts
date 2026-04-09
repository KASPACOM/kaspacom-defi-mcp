import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GALLEON_TESTNET, IGRA_MAINNET } from "../src/core/contracts.js";
import { getActiveLaunches } from "../src/core/tools/getActiveLaunches.js";
import { executeReadTool } from "../src/core/tools/index.js";
import { getPairs } from "../src/core/tools/getPairs.js";
import { getPosition } from "../src/core/tools/getPosition.js";
import { getTokenPrice } from "../src/core/tools/getTokenPrice.js";

function createRpcStub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getBlockNumber: vi.fn(),
    getChainId: vi.fn(),
    getBalance: vi.fn(),
    getTransactionReceipt: vi.fn(),
    ethCall: vi.fn(),
    ...overrides,
  };
}

describe("extended read tool coverage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null for unknown read tools", async () => {
    await expect(executeReadTool("doesNotExist", {}, GALLEON_TESTNET)).resolves.toBeNull();
  });

  it("getPairs clamps invalid limits to the supported range", async () => {
    const response = new Response(
      JSON.stringify({
        data: {
          pairs: [
            {
              id: "0xpair-1",
              token0: { id: "0x0", symbol: "WKAS", name: "Wrapped Kaspa", decimals: "18" },
              token1: { id: "0x1", symbol: "USDC", name: "USD Coin", decimals: "6" },
              reserve0: "10",
              reserve1: "20",
              reserveUSD: "30",
              volumeUSD: "40",
              token0Price: "2",
              token1Price: "0.5",
            },
            {
              id: "0xpair-2",
              token0: { id: "0x2", symbol: "WETH", name: "Wrapped Ether", decimals: "18" },
              token1: { id: "0x1", symbol: "USDC", name: "USD Coin", decimals: "6" },
              reserve0: "11",
              reserve1: "22",
              reserveUSD: "33",
              volumeUSD: "44",
              token0Price: "3",
              token1Price: "0.333333",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(response.clone())));

    const resultMin = await getPairs({ limit: 0 }, GALLEON_TESTNET, createRpcStub() as never);
    const resultMax = await getPairs({ limit: 999 }, GALLEON_TESTNET, createRpcStub() as never);

    expect(resultMin.ok).toBe(true);
    expect((resultMin.data as { pairs: unknown[] }).pairs).toHaveLength(1);
    expect(resultMax.ok).toBe(true);
    expect((resultMax.data as { pairs: unknown[] }).pairs).toHaveLength(2);
  });

  it("getTokenPrice resolves recursive USD pricing through a stable pair", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              pairs: [
                {
                  token0: { id: GALLEON_TESTNET.tokens.WKAS.address.toLowerCase(), symbol: "WKAS" },
                  token1: { id: GALLEON_TESTNET.tokens.WETH.address.toLowerCase(), symbol: "WETH" },
                  token0Price: "0.5",
                  token1Price: "2",
                  reserveUSD: "5000",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              pairs: [
                {
                  token0: { id: GALLEON_TESTNET.tokens.WETH.address.toLowerCase(), symbol: "WETH" },
                  token1: { id: GALLEON_TESTNET.tokens.USDC.address.toLowerCase(), symbol: "USDC" },
                  token0Price: "3000",
                  token1Price: "0.0003333333",
                  reserveUSD: "250000",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await getTokenPrice({ token: "WKAS" }, GALLEON_TESTNET, createRpcStub() as never);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.data).toMatchObject({
      token: "WKAS",
      priceUsd: "1500",
      pairLiquidityUsd: "5000",
      sourcePair: { token0: "WKAS", token1: "WETH" },
    });
  });

  it("getPosition returns a feature-gated error on networks without lending", async () => {
    const result = await getPosition({ address: "0x123" }, IGRA_MAINNET, createRpcStub() as never);

    expect(result).toEqual({
      ok: false,
      network: "igra",
      error: "Lending is not available on igra",
    });
  });

  it("getActiveLaunches supports both array and nested data payload shapes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              tokenName: "Array Launch",
              symbol: "ARR",
              address: "0xarray",
              bondingCurveProgress: 12.3456,
              currentPrice: 0.123456789,
              marketCap: 12345.678,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                name: "Nested Launch",
                tokenSymbol: "NEST",
                tokenAddress: "0xnested",
                progress: 98.7654,
                price: 1.23456789,
                marketCap: 76543.21,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const arrayResult = await getActiveLaunches({}, GALLEON_TESTNET, createRpcStub() as never);
    const nestedResult = await getActiveLaunches({}, GALLEON_TESTNET, createRpcStub() as never);

    expect(arrayResult.ok).toBe(true);
    expect(arrayResult.data).toMatchObject({
      count: 1,
      launches: [{ tokenName: "Array Launch", symbol: "ARR", bondingCurveProgress: "12.35" }],
    });

    expect(nestedResult.ok).toBe(true);
    expect(nestedResult.data).toMatchObject({
      count: 1,
      launches: [{ tokenName: "Nested Launch", symbol: "NEST", currentPrice: "1.23456789" }],
    });
  });
});
