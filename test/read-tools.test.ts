import { describe, it, expect, beforeEach, vi } from "vitest";
import { IGRA_TESTNET, KASPLEX_MAINNET, KASPLEX_TESTNET, IGRA_MAINNET } from "../src/core/contracts.js";
import { getProtocolInfo } from "../src/core/tools/getProtocolInfo.js";
import { getMarkets } from "../src/core/tools/getMarkets.js";
import { getPairs } from "../src/core/tools/getPairs.js";
import { AAVE_POOL_IFACE, ERC20_IFACE } from "../src/core/typed-contracts.js";

function createRpcStub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getBlockNumber: vi.fn().mockResolvedValue(12345n),
    getChainId: vi.fn().mockResolvedValue(BigInt(IGRA_TESTNET.chainId)),
    getBalance: vi.fn(),
    ethCall: vi.fn(),
    ...overrides,
  };
}

describe("read tools", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getProtocolInfo returns valid structure with all networks", async () => {
    const rpc = createRpcStub();
    const result = await getProtocolInfo({}, IGRA_TESTNET, rpc as never);

    expect(result.ok).toBe(true);
    const data = result.data as {
      networks: Array<{ name: string; chainId: number }>;
      gasTips: { minGasPriceWei: string };
      agentsGuide: string;
    };

    expect(data.networks.map((network) => network.name)).toEqual(
      expect.arrayContaining(["igra", "igra-testnet", "kasplex", "kasplex-testnet"])
    );
    expect(data.networks.find((network) => network.name === "kasplex")?.chainId).toBe(202555);
    expect(data.networks.find((network) => network.name === "kasplex-testnet")?.chainId).toBe(167012);
    expect(data.gasTips.minGasPriceWei).toBe("2000000001");
    expect(data.agentsGuide).toContain("KaspaCom DeFi MCP Integration Guide");
  });

  it("getMarkets decodes reserve and balance data", async () => {
    const reserveData = AAVE_POOL_IFACE.encodeFunctionResult("getReserveData", [
      0n,
      0n,
      300_000_000_000_000_000_000_000_000n,
      0n,
      500_000_000_000_000_000_000_000_000n,
      0n,
      0n,
      1,
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
      "0x4444444444444444444444444444444444444444",
      0n,
      0n,
      0n,
    ]);
    const availableLiquidity = ERC20_IFACE.encodeFunctionResult("balanceOf", [800_000_000_000_000_000_000n]);
    const stableDebtSupply = ERC20_IFACE.encodeFunctionResult("totalSupply", [50_000_000_000_000_000_000n]);
    const variableDebtSupply = ERC20_IFACE.encodeFunctionResult("totalSupply", [150_000_000_000_000_000_000n]);

    const rpc = createRpcStub({
      ethCall: vi
        .fn()
        .mockResolvedValueOnce(reserveData)
        .mockResolvedValueOnce(availableLiquidity)
        .mockResolvedValueOnce(stableDebtSupply)
        .mockResolvedValueOnce(variableDebtSupply),
    });

    const singleTokenNetwork = {
      ...IGRA_TESTNET,
      features: { ...IGRA_TESTNET.features, lending: true },
      tokens: { WKAS: IGRA_TESTNET.tokens.WKAS },
    };

    const result = await getMarkets({}, singleTokenNetwork, rpc as never);
    expect(result.ok).toBe(true);

    const data = result.data as {
      markets: Array<{
        token: string;
        apy: string;
        utilization: string;
        availableLiquidity: string;
        totalBorrowed: string;
        totalSupplied: string;
      }>;
    };

    expect(data.markets).toHaveLength(1);
    expect(data.markets[0].token).toBe("WKAS");
    expect(data.markets[0].apy).toBe("30%");
    expect(data.markets[0].availableLiquidity).toBe("800");
    expect(data.markets[0].totalBorrowed).toBe("200");
    expect(data.markets[0].totalSupplied).toBe("1000");
    expect(data.markets[0].utilization).toBe("20%");
  });

  it("getPairs queries subgraph with correct schema variant and formats pair data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            pairs: [
              {
                id: "0xpair",
                token0: {
                  id: "0x0",
                  symbol: "WiKAS",
                  name: "Wrapped Igra Kaspa",
                  decimals: "18",
                  derivedKAS: "1",
                },
                token1: {
                  id: "0x1",
                  symbol: "SPUDZ",
                  name: "SPUDVERSE",
                  decimals: "18",
                  derivedKAS: "0.00002678",
                },
                reserve0: "1234.5678",
                reserve1: "4321.25",
                totalSupply: "2500.123",
                reserveKAS: "2469.13",
                token0Price: "3.5",
                token1Price: "0.285714",
                volumeKAS: "9500.5",
                txCount: "42",
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await getPairs({ limit: 10 }, IGRA_MAINNET, createRpcStub() as never);
    expect(result.ok).toBe(true);

    const data = result.data as {
      endpoint: string;
      pairs: Array<{
        address: string;
        token0: { symbol: string; reserve: string };
        token1: { symbol: string; reserve: string };
        reserveKAS: string;
        volume: string;
        txCount: string;
      }>;
    };

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(data.endpoint).toContain("igra-kas-v2-core");
    expect(data.pairs[0].address).toBe("0xpair");
    expect(data.pairs[0].token0.symbol).toBe("WiKAS");
    expect(data.pairs[0].token1.symbol).toBe("SPUDZ");
    expect(data.pairs[0].reserveKAS).toBe("2469.13");
    expect(data.pairs[0].volume).toBe("9500.5");
    expect(data.pairs[0].txCount).toBe("42");

    // Verify the query uses KAS-variant fields
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.query).toContain("reserveKAS");
    expect(body.query).not.toContain("reserveETH");
  });
});
