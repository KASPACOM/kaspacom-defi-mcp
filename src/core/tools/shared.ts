import * as fs from "fs";
import * as path from "path";
import {
  GAS_LIMITS,
  MIN_GAS_PRICE,
  type NetworkConfig,
  type TokenInfo,
  getTokenByAddress,
} from "../contracts.js";

export interface ToolResult<T = unknown> {
  ok: boolean;
  network: string;
  data?: T;
  error?: string;
}

export const STABLE_SYMBOLS = new Set(["USDC", "USDT", "DAI", "USDS", "USDE"]);
const AAVE_BASE_DECIMALS = 8;
const RAY = 10n ** 27n;

export function success<T>(network: NetworkConfig, data: T): ToolResult<T> {
  return { ok: true, network: network.name, data };
}

export function failure(network: NetworkConfig, error: string): ToolResult<never> {
  return { ok: false, network: network.name, error };
}

export function formatUnitsSafe(value: bigint, decimals: number, precision = 6): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return whole.toString();
  const padded = fraction.toString().padStart(decimals, "0");
  const trimmed = padded.slice(0, Math.min(decimals, precision)).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

export function formatDecimal(value: number, precision = 6): string {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(precision).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function formatPercent(value: number, precision = 2): string {
  return `${formatDecimal(value, precision)}%`;
}

export function formatAaveBase(value: bigint): string {
  return formatUnitsSafe(value, AAVE_BASE_DECIMALS, 4);
}

export function formatRay(value: bigint): string {
  const integer = Number(value / RAY);
  const fraction = Number((value % RAY) / 10n ** 23n) / 10_000;
  return formatDecimal(integer + fraction, 4);
}

export function calculateUtilization(totalBorrowed: bigint, totalSupplied: bigint): number {
  if (totalSupplied === 0n) return 0;
  return Number(totalBorrowed) / Number(totalSupplied) * 100;
}

export function apyFromRayRate(rate: bigint): number {
  return Number(rate) / 1e25;
}

export function getGasTips(): Record<string, string | Record<string, string>> {
  return {
    minGasPriceWei: MIN_GAS_PRICE.toString(),
    minGasPriceGwei: formatDecimal(Number(MIN_GAS_PRICE) / 1e9, 9),
    note: "IGRA-family chains require gas price strictly above 2 gwei; use static gas limits.",
    limits: Object.fromEntries(
      Object.entries(GAS_LIMITS).map(([key, value]) => [key, value.toString()])
    ),
  };
}

export function getAgentsGuide(): string {
  const candidates = [
    path.resolve(__dirname, "../../../AGENTS.md"),
    path.resolve(process.cwd(), "AGENTS.md"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8");
    }
  }

  return "AGENTS.md not found";
}

export function resolveWalletAddress(params: Record<string, unknown>): string | undefined {
  const address = params.address;
  return typeof address === "string" && address.trim() ? address.trim() : undefined;
}

export function getTokenMetadata(network: NetworkConfig, address: string): TokenInfo {
  return getTokenByAddress(network, address) ?? {
    symbol: address.slice(0, 6),
    address,
    decimals: 18,
  };
}
