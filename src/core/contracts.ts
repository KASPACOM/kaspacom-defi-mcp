/**
 * contracts.ts — Network config and deployed contract addresses
 * for KaspaCom DeFi on IGRA (Kaspa L2 EVM chain).
 *
 * Rule: No side effects on import. Pure data + helpers only.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
}

export interface NetworkContracts {
  wkas: string;
  dex: {
    factory: string;
    router: string;
    routerPermitFee: string;
  };
  lending: {
    pool: string;
    oracle: string;
    poolAddressesProvider: string;
    uiPoolDataProvider: string;
    poolDataProvider: string;
    wrappedTokenGateway: string;
  };
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpc: string;
  explorer: string;
  contracts: NetworkContracts;
  tokens: Record<string, TokenInfo>;
}

// ─── Galleon Testnet (chainId 38836) ─────────────────────────────────────────

const GALLEON_TOKENS: Record<string, TokenInfo> = {
  WKAS: {
    symbol: "WKAS",
    address: "0x394C68684F9AFCEb9b804531EF07a864E8081738",
    decimals: 18,
  },
  WBTC: {
    symbol: "WBTC",
    address: "0x2429526815517B971d45B0899C3D67990A68BcD7",
    decimals: 8,
  },
  WETH: {
    symbol: "WETH",
    address: "0x23A8E284A6193C1D6A51A7b34d047ae0b969D660",
    decimals: 18,
  },
  DAI: {
    symbol: "DAI",
    address: "0x2c680F22600A632c9291c2f1E3b070ED79c1168e",
    decimals: 18,
  },
  USDC: {
    symbol: "USDC",
    address: "0xfEE6ee271c2fD76EdAd5De7B8177C3935799111A",
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    address: "0xDaf8B68Cdf320727af105bCa68e174b5EDB3433E",
    decimals: 6,
  },
};

export const GALLEON_TESTNET: NetworkConfig = {
  name: "galleon",
  chainId: 38836,
  rpc: "https://galleon-testnet.igralabs.com:8545",
  explorer: "https://explorer.galleon-testnet.igralabs.com",
  contracts: {
    wkas: "0x394C68684F9AFCEb9b804531EF07a864E8081738",
    dex: {
      factory: "0xc61aeAdA8888A0e9FF5709A8386c8527CD5065d0",
      router: "0x47F80b6D7071B7738D6DD9d973D7515ce753e9d9",
      routerPermitFee: "0xAC11b74CD03006644e11991C43E78933579fc5fd",
    },
    lending: {
      pool: "0xb265EA393A9297472628E21575AE5c7E6458A1F2",
      oracle: "0x5B83681E48f365cfD2A4Ee29E2B699e38e04EbD9",
      poolAddressesProvider: "0x4f6110740149a550eE89B21Bc81893CB2B56f39f",
      uiPoolDataProvider: "0xCC79B6e8F0389720c099E9621724AEBc97828436",
      poolDataProvider: "0xc6b4592171EC79192f838E4050a2453D4D71fBAe",
      wrappedTokenGateway: "0x89F4834CEe75f53dFb9F717362DC1a574966632e",
    },
  },
  tokens: GALLEON_TOKENS,
};

// ─── IGRA Mainnet (chainId 38833) — stub ──────────────────────────────────────

const IGRA_MAINNET_TOKENS: Record<string, TokenInfo> = {
  WKAS: {
    symbol: "WKAS",
    address: "0x17Ec7E1768c813E2a3a9b0f94A35605CA520C242",
    decimals: 18,
  },
  // Additional mainnet tokens TBD
};

export const IGRA_MAINNET: NetworkConfig = {
  name: "igra",
  chainId: 38833,
  rpc: "https://rpc.igralabs.com:8545",
  explorer: "https://explorer.igralabs.com",
  contracts: {
    wkas: "0x17Ec7E1768c813E2a3a9b0f94A35605CA520C242",
    dex: {
      factory: "0x21350BcDa9E81731CF4cDE3DbC457e3de2739c01",
      router: "0x771dfB21e1CD8EA3e8B68cB2469eDaF9548c2523",
      routerPermitFee: "0xDD1aBB133D027f4F67571b5bEEDC9cd9a93C13Ca",
    },
    lending: {
      // Mainnet lending addresses TBD
      pool: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      poolAddressesProvider: "0x0000000000000000000000000000000000000000",
      uiPoolDataProvider: "0x0000000000000000000000000000000000000000",
      poolDataProvider: "0x0000000000000000000000000000000000000000",
      wrappedTokenGateway: "0x0000000000000000000000000000000000000000",
    },
  },
  tokens: IGRA_MAINNET_TOKENS,
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const NETWORKS: Record<string, NetworkConfig> = {
  galleon: GALLEON_TESTNET,
  testnet: GALLEON_TESTNET, // alias
  igra: IGRA_MAINNET,
  mainnet: IGRA_MAINNET, // alias
};

/**
 * Get a network config by name. Throws if unknown.
 * Accepts: "galleon", "testnet", "igra", "mainnet"
 */
export function getNetwork(name: string): NetworkConfig {
  const key = name.toLowerCase();
  const net = NETWORKS[key];
  if (!net) {
    throw new Error(
      `Unknown network: "${name}". Valid options: ${Object.keys(NETWORKS).join(", ")}`
    );
  }
  return net;
}

/**
 * Look up a token by symbol on the given network. Returns undefined if not found.
 */
export function getToken(
  network: NetworkConfig,
  symbol: string
): TokenInfo | undefined {
  return network.tokens[symbol.toUpperCase()];
}

/**
 * Look up a token address by symbol. Throws if not found.
 */
export function requireToken(network: NetworkConfig, symbol: string): TokenInfo {
  const token = getToken(network, symbol);
  if (!token) {
    throw new Error(
      `Token "${symbol}" not found on network "${network.name}". ` +
        `Available: ${Object.keys(network.tokens).join(", ")}`
    );
  }
  return token;
}

// ─── Gas constants ────────────────────────────────────────────────────────────

/**
 * Minimum gas price on IGRA (1 wei above 2 gwei — mempool quirk)
 */
export const MIN_GAS_PRICE = 2_000_000_001n;

/**
 * Static gas limits — eth_estimateGas is unreliable on IGRA
 */
export const GAS_LIMITS = {
  approve: 100_000n,
  swap: 350_000n,
  addLiquidity: 400_000n,
  removeLiquidity: 400_000n,
  supply: 500_000n,
  borrow: 500_000n,
  repay: 500_000n,
  withdraw: 500_000n,
  depositETH: 500_000n,
  withdrawETH: 500_000n,
} as const;

export type GasLimitKey = keyof typeof GAS_LIMITS;
