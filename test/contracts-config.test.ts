import { describe, expect, it } from "vitest";
import {
  GALLEON_TESTNET,
  IGRA_MAINNET,
  KASPLEX_MAINNET,
  getNetwork,
  getTokenByAddress,
  listNetworks,
  requireToken,
} from "../src/core/contracts.js";
import { assertAddress, parseCliNetwork } from "../src/core/validation.js";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

describe("network and contract config sanity", () => {
  it("resolves canonical networks and aliases", () => {
    expect(getNetwork("galleon")).toBe(GALLEON_TESTNET);
    expect(getNetwork("testnet")).toBe(GALLEON_TESTNET);
    expect(getNetwork("igra")).toBe(IGRA_MAINNET);
    expect(getNetwork("mainnet")).toBe(IGRA_MAINNET);
    expect(getNetwork("kasplex")).toBe(KASPLEX_MAINNET);
  });

  it("rejects unknown networks with helpful valid options", () => {
    expect(() => getNetwork("unknown-net")).toThrowError(
      'Unknown network: "unknown-net". Valid options: galleon, testnet, igra, mainnet, kasplex'
    );
  });

  it("exposes unique canonical networks only", () => {
    const networks = listNetworks();
    expect(networks.map((network) => network.name)).toEqual(["galleon", "igra", "kasplex"]);
    expect(new Set(networks.map((network) => network.chainId)).size).toBe(networks.length);
  });

  it("keeps token and contract addresses internally consistent", () => {
    for (const network of listNetworks()) {
      expect(network.tokens.WKAS.address).toBe(network.contracts.wkas);
      expect(network.contracts.wkas).toMatch(ADDRESS_RE);
      expect(network.rpc).toMatch(/^https:\/\//);
      expect(network.subgraphUrl).toMatch(/^https:\/\//);

      if (network.features.dex) {
        expect(network.contracts.dex.factory).toMatch(ADDRESS_RE);
        expect(network.contracts.dex.router).toMatch(ADDRESS_RE);
        expect(network.contracts.dex.routerPermitFee).toMatch(ADDRESS_RE);
      }

      const lendingAddresses = Object.values(network.contracts.lending);
      if (network.features.lending) {
        expect(lendingAddresses).toHaveLength(6);
        for (const address of lendingAddresses) {
          expect(address).toMatch(ADDRESS_RE);
        }
      } else {
        expect(lendingAddresses.every((address) => address === "")).toBe(true);
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
      getTokenByAddress(GALLEON_TESTNET, "0xFEE6EE271C2FD76EDAD5DE7B8177C3935799111A")?.symbol
    ).toBe("USDC");

    expect(() => requireToken(IGRA_MAINNET, "USDC")).toThrowError(
      'Token "USDC" not found on network "igra". Available: WKAS'
    );
  });

  it("normalizes valid CLI networks and rejects invalid ones with canonical guidance", () => {
    expect(parseCliNetwork("GALLEON")).toBe("galleon");
    expect(parseCliNetwork("mainnet")).toBe("igra");
    expect(parseCliNetwork("kasplex")).toBe("kasplex");

    expect(() => parseCliNetwork("weirdnet")).toThrowError(
      'Invalid network "weirdnet". Use one of: galleon, igra, kasplex'
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
