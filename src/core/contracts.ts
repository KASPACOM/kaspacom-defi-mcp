/**
 * contracts.ts — Network config and deployed contract addresses
 * for KaspaCom DeFi on IGRA / Kasplex EVM networks.
 *
 * Rule: No side effects on import. Pure data + helpers only.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
}

export interface NetworkFeatures {
  dex: boolean;
  lending: boolean;
  launchpad: boolean;
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
  aliases: string[];
  chainId: number;
  rpc: string;
  explorer: string;
  subgraphUrl: string;
  dexSubgraphName: string;
  /** Network name for api-defi.kaspa.com endpoints. Only "igra" and "kasplex" are supported (no testnet). */
  defiApiNetwork: string | null;
  launchpadApiNetwork: string;
  /** Subgraph schema variant: "kas" uses reserveKAS/derivedKAS, "eth" uses reserveETH/derivedETH (legacy testnet) */
  subgraphSchemaVariant: "kas" | "eth";
  features: NetworkFeatures;
  contracts: NetworkContracts;
  tokens: Record<string, TokenInfo>;
}

// ─── IGRA Testnet / Galleon (chainId 38836) ──────────────────────────────────

const IGRA_TESTNET_TOKENS: Record<string, TokenInfo> = {
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

export const IGRA_TESTNET: NetworkConfig = {
  name: "igra-testnet",
  aliases: ["galleon", "testnet"],
  chainId: 38836,
  rpc: "https://galleon-testnet.igralabs.com:8545",
  explorer: "https://explorer.galleon-testnet.igralabs.com",
  subgraphUrl: "https://dev-graph-igra.kaspa.com",
  dexSubgraphName: "igra-testnet-v2-core",
  defiApiNetwork: null,
  launchpadApiNetwork: "igra",
  subgraphSchemaVariant: "eth",
  features: {
    dex: true,
    lending: true,
    launchpad: true,
  },
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
  tokens: IGRA_TESTNET_TOKENS,
};

export const GALLEON_TESTNET = IGRA_TESTNET;

// ─── IGRA Mainnet (chainId 38833) ────────────────────────────────────────────

const IGRA_MAINNET_TOKENS: Record<string, TokenInfo> = {
  WiKAS: {
    symbol: "WiKAS",
    address: "0x17Ec7E1768c813E2a3a9b0f94A35605CA520C242",
    decimals: 18,
  },
};

export const IGRA_MAINNET: NetworkConfig = {
  name: "igra",
  aliases: ["igra-mainnet", "mainnet"],
  chainId: 38833,
  rpc: "https://rpc.igralabs.com:8545",
  explorer: "https://explorer.igralabs.com",
  subgraphUrl: "https://graph-igra.kaspa.com",
  dexSubgraphName: "igra-kas-v2-core",
  defiApiNetwork: "igra",
  launchpadApiNetwork: "igra",
  subgraphSchemaVariant: "kas",
  features: {
    dex: true,
    lending: false,
    launchpad: true,
  },
  contracts: {
    wkas: "0x17Ec7E1768c813E2a3a9b0f94A35605CA520C242",
    dex: {
      factory: "0x21350BcDa9E81731CF4cDE3DbC457e3de2739c01",
      router: "0x771dfB21e1CD8EA3e8B68cB2469eDaF9548c2523",
      routerPermitFee: "0xDD1aBB133D027f4F67571b5bEEDC9cd9a93C13Ca",
    },
    lending: {
      pool: "",
      oracle: "",
      poolAddressesProvider: "",
      uiPoolDataProvider: "",
      poolDataProvider: "",
      wrappedTokenGateway: "",
    },
  },
  tokens: IGRA_MAINNET_TOKENS,
};

// ─── Kasplex Testnet (chainId 167012) ────────────────────────────────────────

const KASPLEX_TESTNET_TOKENS: Record<string, TokenInfo> = {
  WKAS: {
    symbol: "WKAS",
    address: "0xf40178040278E16c8813dB20a84119A605812FB3",
    decimals: 18,
  },
  WBTC: {
    symbol: "WBTC",
    address: "0x508B83AB67fEDcd1e8b6F8AE88F5Eb0B1670eFb6",
    decimals: 8,
  },
  WETH: {
    symbol: "WETH",
    address: "0x54319ceE10d537Dec6aa812d6f22eC3F31AC7ca6",
    decimals: 18,
  },
  DAI: {
    symbol: "DAI",
    address: "0x9E7edE66d39d9b69d817b7368CD9d66a7D6Dc468",
    decimals: 18,
  },
  USDC: {
    symbol: "USDC",
    address: "0xFC84a4b04E0074D08c4242A291bfC73840E5Ad14",
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    address: "0xDaf8B68Cdf320727af105bCa68e174b5EDB3433E",
    decimals: 6,
  },
};

export const KASPLEX_TESTNET: NetworkConfig = {
  name: "kasplex-testnet",
  aliases: ["kasplex-test"],
  chainId: 167012,
  rpc: "https://rpc.kasplextest.xyz",
  explorer: "https://explorer.testnet.kasplextest.xyz",
  subgraphUrl: "https://dev-graph-kasplex.kaspa.com",
  dexSubgraphName: "kasplex-testnet-kas-new-v2-core",
  defiApiNetwork: null,
  launchpadApiNetwork: "kasplex",
  subgraphSchemaVariant: "kas",
  features: {
    dex: true,
    lending: true,
    launchpad: true,
  },
  contracts: {
    wkas: "0xf40178040278E16c8813dB20a84119A605812FB3",
    dex: {
      factory: "0x89d5842017ceA7dd18D10EE6c679cE199d2aD99E",
      router: "0x81Cc4e7DbC652ec9168Bc2F4435C02d7F315148e",
      routerPermitFee: "0x5B7e7830851816f8ad968B0e0c336bd50b4860Ad",
    },
    lending: {
      oracle: "0x0730633De813d5EEbAaD00538c468c01897A23b0",
      pool: "0x6715ff97db95D74f92d5a45b8BB3239389F9ddF4",
      poolAddressesProvider: "0x83F5E070924586cDd7c55f7BC3EDe6885BFcE4dB",
      uiPoolDataProvider: "0x40C537bcd43173CcBB374241a88c0F14F0DEFA1e",
      poolDataProvider: "0x93952B31970a4abf5455BFD80FC90B9c874EF801",
      wrappedTokenGateway: "0xeb72383b0C0EA901932c52Ab4296E6cCDdD584BC",
    },
  },
  tokens: KASPLEX_TESTNET_TOKENS,
};

// ─── Kasplex Mainnet (chainId 202555) ────────────────────────────────────────

const KASPLEX_MAINNET_TOKENS: Record<string, TokenInfo> = {
  WKAS: {
    symbol: "WKAS",
    address: "0x2c2Ae87Ba178F48637acAe54B87c3924F544a83e",
    decimals: 18,
  },
  ZEAL: {
    symbol: "ZEAL",
    address: "0xb7a95035618354d9adfc49eca49f38586b624040",
    decimals: 18,
  },
  NACHO: {
    symbol: "NACHO",
    address: "0x9a5a144290dffa24c6c7aa8ca9a62319e60973d8",
    decimals: 18,
  },
  KASPY: {
    symbol: "KASPY",
    address: "0x58AC2306566074Cc8C1c7704B53D7D2B6A656ca8",
    decimals: 18,
  },
  WOLFY: {
    symbol: "WOLFY",
    address: "0xaf109de38a3e9c78260d8f02016dd1cb2fa2d168",
    decimals: 18,
  },
  CRUMBS: {
    symbol: "CRUMBS",
    address: "0x7420872D0F2A6b6a3C87dE0D2a4b1C08C7A49f8d",
    decimals: 18,
  },
  KASMO: {
    symbol: "KASMO",
    address: "0x31e8aea3259e357042c8fd791250c108e2d27728",
    decimals: 18,
  },
  KPAW: {
    symbol: "KPAW",
    address: "0x2751193fA6e3A6C8c0D9c5eB1765c81e5b4aBc31",
    decimals: 18,
  },
  FUND: {
    symbol: "FUND",
    address: "0xE98f85b036A1f7d6A59cF6A7f99f89A76b85F9f1",
    decimals: 18,
  },
};

export const KASPLEX_MAINNET: NetworkConfig = {
  name: "kasplex",
  aliases: ["kasplex-mainnet"],
  chainId: 202555,
  rpc: "https://evmrpc.kasplex.org",
  explorer: "https://explorer.kasplex.org/",
  subgraphUrl: "https://graph-kasplex.kaspa.com",
  dexSubgraphName: "kasplex-kas-v2-core",
  defiApiNetwork: "kasplex",
  launchpadApiNetwork: "kasplex",
  subgraphSchemaVariant: "kas",
  features: {
    dex: true,
    lending: true,
    launchpad: true,
  },
  contracts: {
    wkas: "0x2c2Ae87Ba178F48637acAe54B87c3924F544a83e",
    dex: {
      factory: "0xa9CBa43A407c9Eb30933EA21f7b9D74A128D613c",
      router: "0x3a1f0bD164fe9D8fa18Da5abAB352dC634CA5F10",
      routerPermitFee: "0x4c5BEaAE83577E3a117ce2F477fC42a1EA39A8a3",
    },
    lending: {
      oracle: "0x6f10A47E2Df6138a36Bc785DA927Ea4072fd4c8f",
      pool: "0x631BC5c362ce203B6043844f93f2c67D23a87994",
      poolAddressesProvider: "0xEf0a017368a8C179895Ffff65C731510eB28d964",
      uiPoolDataProvider: "0xd1b82017FAA537C1064B111E597D5003a66A23Fb",
      poolDataProvider: "0x22B9bDEA931cE0b137DAEf80B2228a288ba05835",
      wrappedTokenGateway: "0x0df0Ff6bBC7F5F881cbA5310Ef90b033d47470c2",
    },
  },
  tokens: KASPLEX_MAINNET_TOKENS,
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const CANONICAL_NETWORK_NAMES = [
  "igra",
  "igra-testnet",
  "kasplex",
  "kasplex-testnet",
] as const;

export const NETWORKS: Record<string, NetworkConfig> = {
  igra: IGRA_MAINNET,
  "igra-mainnet": IGRA_MAINNET,
  mainnet: IGRA_MAINNET,
  "igra-testnet": IGRA_TESTNET,
  galleon: IGRA_TESTNET,
  testnet: IGRA_TESTNET,
  kasplex: KASPLEX_MAINNET,
  "kasplex-mainnet": KASPLEX_MAINNET,
  "kasplex-testnet": KASPLEX_TESTNET,
  "kasplex-test": KASPLEX_TESTNET,
};

export const CANONICAL_NETWORKS: NetworkConfig[] = [
  IGRA_MAINNET,
  IGRA_TESTNET,
  KASPLEX_MAINNET,
  KASPLEX_TESTNET,
];

/**
 * Get a network config by name. Throws if unknown.
 * Accepts canonical names plus aliases like "galleon", "testnet", and "mainnet".
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
  // Try exact match first, then case-insensitive
  const direct = network.tokens[symbol] ?? network.tokens[symbol.toUpperCase()];
  if (direct) return direct;
  const upper = symbol.toUpperCase();
  return Object.values(network.tokens).find(
    (t) => t.symbol.toUpperCase() === upper
  );
}

export function listNetworks(): NetworkConfig[] {
  return CANONICAL_NETWORKS;
}

export function getTokenByAddress(
  network: NetworkConfig,
  address: string
): TokenInfo | undefined {
  const lowerAddress = address.toLowerCase();
  return Object.values(network.tokens).find(
    (token) => token.address.toLowerCase() === lowerAddress
  );
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
