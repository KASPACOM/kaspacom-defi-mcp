import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GALLEON_TESTNET, IGRA_MAINNET, KASPLEX_MAINNET } from "../src/core/contracts.js";
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
              token0: { id: "0x0", symbol: "WKAS", name: "Wrapped Kaspa", decimals: "18", derivedETH: "1" },
              token1: { id: "0x1", symbol: "USDC", name: "USD Coin", decimals: "6", derivedETH: "0.5" },
              reserve0: "10",
              reserve1: "20",
              reserveETH: "30",
              totalSupply: "100",
              token0Price: "2",
              token1Price: "0.5",
              volumeUSD: "40",
              txCount: "5",
            },
            {
              id: "0xpair-2",
              token0: { id: "0x2", symbol: "WETH", name: "Wrapped Ether", decimals: "18", derivedETH: "2" },
              token1: { id: "0x1", symbol: "USDC", name: "USD Coin", decimals: "6", derivedETH: "0.5" },
              reserve0: "11",
              reserve1: "22",
              reserveETH: "33",
              totalSupply: "200",
              token0Price: "3",
              token1Price: "0.333333",
              volumeUSD: "44",
              txCount: "10",
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

  it("getTokenPrice uses api-defi for prod networks", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          tokens: [
            {
              id: KASPLEX_MAINNET.tokens.WKAS.address.toLowerCase(),
              symbol: "WKAS",
              name: "Wrapped KAS",
              decimals: "18",
              tokenPriceUSD: 0.0523,
              marketCapUSD: 1250000.5,
            },
          ],
          pagination: { first: 500, skip: 0, count: 1, total: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await getTokenPrice({ token: "WKAS" }, KASPLEX_MAINNET, createRpcStub() as never);

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      token: "WKAS",
      priceUsd: "0.0523",
      marketCapUsd: "1250000.5",
      source: "api-defi",
    });
  });

  it("getTokenPrice falls back to subgraph derivedKAS on testnet", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            tokens: [
              {
                id: GALLEON_TESTNET.tokens.WKAS.address.toLowerCase(),
                symbol: "WKAS",
                derivedETH: "1",
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
    expect(result.data).toMatchObject({
      token: "WKAS",
      priceInKas: "1",
      source: "subgraph",
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

  it("getActiveLaunches parses LFG search API response", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          result: [
            {
              tokenAddress: "0xtoken1",
              ticker: "SPUDZ",
              name: "SPUDVERSE",
              state: "graduated",
              price: 0.00002656,
              marketCap: 762236.78,
              progress: 100,
              holderCount: 423,
              volume: { "1h": 0, "1d": 15841.25 },
              priceChange: { "1d": -6.61 },
              socials: { telegram: "SpudzByNotshore" },
              image: "bafkreig47rbe5mx6bg7rqlr2qtk6mfmtxlnaoj273fepdhazxonxb3qk5q",
              createdAt: "2026-03-31T07:14:53.938Z",
              updatedAt: "2026-04-13T07:07:00.291Z",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await getActiveLaunches({}, IGRA_MAINNET, createRpcStub() as never);

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      count: 1,
      launches: [
        {
          ticker: "SPUDZ",
          name: "SPUDVERSE",
          state: "graduated",
          marketCap: "762236.78",
          progress: "100",
          holderCount: 423,
          volume24h: "15841.25",
          priceChange24h: "-6.61",
        },
      ],
    });

    // Verify correct API endpoint
    expect(fetchMock.mock.calls[0][0]).toContain("/explorer/lfg-tokens/search");
    expect(fetchMock.mock.calls[0][0]).toContain("network=igra");
  });
});
