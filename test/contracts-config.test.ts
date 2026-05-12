import { describe, expect, it } from "vitest";
import {
  GALLEON_TESTNET,
  IGRA_MAINNET,
  IGRA_TESTNET,
  KASPLEX_MAINNET,
  KASPLEX_TESTNET,
  getNetwork,
  getToken,
  getTokenByAddress,
  listNetworks,
  requireToken,
} from "../src/core/contracts.js";
import { assertAddress, parseCliNetwork } from "../src/core/validation.js";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

describe("network and contract config sanity", () => {
  it("resolves canonical networks and aliases", () => {
    expect(getNetwork("igra")).toBe(IGRA_MAINNET);
    expect(getNetwork("igra-mainnet")).toBe(IGRA_MAINNET);
    expect(getNetwork("mainnet")).toBe(IGRA_MAINNET);
    expect(getNetwork("igra-testnet")).toBe(IGRA_TESTNET);
    expect(getNetwork("galleon")).toBe(GALLEON_TESTNET);
    expect(getNetwork("testnet")).toBe(IGRA_TESTNET);
    expect(getNetwork("kasplex")).toBe(KASPLEX_MAINNET);
    expect(getNetwork("kasplex-mainnet")).toBe(KASPLEX_MAINNET);
    expect(getNetwork("kasplex-testnet")).toBe(KASPLEX_TESTNET);
    expect(getNetwork("kasplex-test")).toBe(KASPLEX_TESTNET);
  });

  it("rejects unknown networks with helpful valid options", () => {
    expect(() => getNetwork("unknown-net")).toThrowError(
      'Unknown network: "unknown-net". Valid options: igra, igra-mainnet, mainnet, igra-testnet, galleon, testnet, kasplex, kasplex-mainnet, kasplex-testnet, kasplex-test'
    );
  });

  it("exposes unique canonical networks only", () => {
    const networks = listNetworks();
    expect(networks.map((network) => network.name)).toEqual([
      "igra",
      "igra-testnet",
      "kasplex",
      "kasplex-testnet",
    ]);
    expect(new Set(networks.map((network) => network.chainId)).size).toBe(networks.length);
  });

  it("keeps token and contract addresses internally consistent", () => {
    for (const network of listNetworks()) {
      // Wrapped KAS token may be WKAS or WiKAS depending on network
      const wrappedKas = network.tokens.WKAS ?? network.tokens.WiKAS;
      expect(wrappedKas).toBeDefined();
      expect(wrappedKas.address).toBe(network.contracts.wkas);
      expect(network.contracts.wkas).toMatch(ADDRESS_RE);
      expect(network.rpc).toMatch(/^https:\/\//);
      expect(network.subgraphUrl).toMatch(/^https:\/\//);
      expect(network.dexSubgraphName.length).toBeGreaterThan(0);
      expect(network.launchpadApiNetwork.length).toBeGreaterThan(0);

      if (network.features.dex) {
        expect(network.contracts.dex.factory).toMatch(ADDRESS_RE);
        expect(network.contracts.dex.router).toMatch(ADDRESS_RE);
        expect(network.contracts.dex.routerPermitFee).toMatch(ADDRESS_RE);
      }

      const lending = network.contracts.lending;
      const requiredLendingAddresses = [
        lending.pool,
        lending.oracle,
        lending.poolAddressesProvider,
        lending.uiPoolDataProvider,
        lending.poolDataProvider,
        lending.wrappedTokenGateway,
      ];
      const optionalLendingAddresses = [
        lending.kaskadPriceOracle,
        lending.kaskadRouter,
        lending.uiDataProviderWrapper,
      ].filter((address): address is string => Boolean(address));
      if (network.features.lending) {
        for (const address of [...requiredLendingAddresses, ...optionalLendingAddresses]) {
          expect(address).toMatch(ADDRESS_RE);
        }
        if (lending.kaskadEnclaveApiUrl) {
          expect(lending.kaskadEnclaveApiUrl).toMatch(/^https:\/\//);
        }
      } else {
        expect(requiredLendingAddresses.every((address) => address === "")).toBe(true);
        expect(optionalLendingAddresses).toHaveLength(0);
        expect(lending.kaskadEnclaveApiUrl).toBeUndefined();
      }

      for (const token of Object.values(network.tokens)) {
        expect(token.symbol).toBeTruthy();
        expect(token.address).toMatch(ADDRESS_RE);
        expect(Number.isInteger(token.decimals)).toBe(true);
        expect(token.decimals).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("looks up tokens case-insensitively by address and reports missing symbols", () => {
    expect(
      getTokenByAddress(IGRA_TESTNET, "0xFEE6EE271C2FD76EDAD5DE7B8177C3935799111A")?.symbol
    ).toBe("USDC");
    expect(getToken(IGRA_MAINNET, "WKAS")?.address).toBe(IGRA_MAINNET.contracts.wkas);
    expect(requireToken(IGRA_MAINNET, "WKAS").symbol).toBe("WiKAS");

    expect(() => requireToken(IGRA_MAINNET, "USDC")).toThrowError(
      'Token "USDC" not found on network "igra". Available: WiKAS'
    );
  });

  it("normalizes valid CLI networks and rejects invalid ones with canonical guidance", () => {
    expect(parseCliNetwork("GALLEON")).toBe("igra-testnet");
    expect(parseCliNetwork("igra-testnet")).toBe("igra-testnet");
    expect(parseCliNetwork("mainnet")).toBe("igra");
    expect(parseCliNetwork("kasplex")).toBe("kasplex");
    expect(parseCliNetwork("kasplex-testnet")).toBe("kasplex-testnet");

    expect(() => parseCliNetwork("weirdnet")).toThrowError(
      'Invalid network "weirdnet". Use one of: igra, igra-testnet, kasplex, kasplex-testnet'
    );
  });

  it("validates EVM addresses with a clear error", () => {
    expect(assertAddress("0x1111111111111111111111111111111111111111")).toBe(
      "0x1111111111111111111111111111111111111111"
    );

    expect(() => assertAddress("not-an-address", "address")).toThrowError(
      'Invalid address: "not-an-address". Expected a 0x-prefixed 40-byte hex address.'
    );
  });
});
