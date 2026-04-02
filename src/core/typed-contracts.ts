/**
 * typed-contracts.ts — ABI encoding/decoding using ethers v6 Interface.
 *
 * Rules:
 * - NO ethers Provider — only Interface for encode/decode
 * - Minimal ABI fragments — only the functions we use
 * - All amounts in wei/smallest-unit at this layer
 * - No side effects on import
 */

import { Interface, type Result } from "ethers";
import type { RpcClient } from "./rpc.js";

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

const UNISWAP_V2_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB)",
  "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)",
];

const UNISWAP_V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
  "function allPairs(uint256 index) view returns (address pair)",
  "function allPairsLength() view returns (uint256)",
];

const UNISWAP_V2_PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function totalSupply() view returns (uint256)",
];

const AAVE_POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)",
  "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  "function getReserveData(address asset) view returns (uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt)",
];

const WRAPPED_TOKEN_GATEWAY_ABI = [
  "function depositETH(address pool, address onBehalfOf, uint16 referralCode) payable",
  "function withdrawETH(address pool, uint256 amount, address to)",
];

// ─── Interface singletons ─────────────────────────────────────────────────────

export const ERC20_IFACE = new Interface(ERC20_ABI);
export const ROUTER_IFACE = new Interface(UNISWAP_V2_ROUTER_ABI);
export const FACTORY_IFACE = new Interface(UNISWAP_V2_FACTORY_ABI);
export const PAIR_IFACE = new Interface(UNISWAP_V2_PAIR_ABI);
export const AAVE_POOL_IFACE = new Interface(AAVE_POOL_ABI);
export const WRAPPED_GATEWAY_IFACE = new Interface(WRAPPED_TOKEN_GATEWAY_ABI);

// ─── Decode helper ────────────────────────────────────────────────────────────

function decodeResult(iface: Interface, fragment: string, data: string): Result {
  return iface.decodeFunctionResult(fragment, data);
}

// ─── ERC20 ────────────────────────────────────────────────────────────────────

export interface Erc20Contract {
  /** encode approve(spender, amount) calldata */
  encodeApprove(spender: string, amount: bigint): string;
  /** encode balanceOf(account) calldata */
  encodeBalanceOf(account: string): string;
  /** decode balanceOf result */
  decodeBalanceOf(data: string): bigint;
  /** encode allowance(owner, spender) calldata */
  encodeAllowance(owner: string, spender: string): string;
  /** decode allowance result */
  decodeAllowance(data: string): bigint;
  /** encode decimals() calldata */
  encodeDecimals(): string;
  /** decode decimals result */
  decodeDecimals(data: string): number;
  /** encode symbol() calldata */
  encodeSymbol(): string;
  /** decode symbol result */
  decodeSymbol(data: string): string;
  /** encode totalSupply() calldata */
  encodeTotalSupply(): string;
  /** decode totalSupply result */
  decodeTotalSupply(data: string): bigint;
}

export function erc20(address: string): Erc20Contract & { address: string } {
  return {
    address,
    encodeApprove: (spender, amount) =>
      ERC20_IFACE.encodeFunctionData("approve", [spender, amount]),
    encodeBalanceOf: (account) =>
      ERC20_IFACE.encodeFunctionData("balanceOf", [account]),
    decodeBalanceOf: (data) => BigInt(decodeResult(ERC20_IFACE, "balanceOf", data)[0]),
    encodeAllowance: (owner, spender) =>
      ERC20_IFACE.encodeFunctionData("allowance", [owner, spender]),
    decodeAllowance: (data) => BigInt(decodeResult(ERC20_IFACE, "allowance", data)[0]),
    encodeDecimals: () => ERC20_IFACE.encodeFunctionData("decimals", []),
    decodeDecimals: (data) => Number(decodeResult(ERC20_IFACE, "decimals", data)[0]),
    encodeSymbol: () => ERC20_IFACE.encodeFunctionData("symbol", []),
    decodeSymbol: (data) => String(decodeResult(ERC20_IFACE, "symbol", data)[0]),
    encodeTotalSupply: () => ERC20_IFACE.encodeFunctionData("totalSupply", []),
    decodeTotalSupply: (data) => BigInt(decodeResult(ERC20_IFACE, "totalSupply", data)[0]),
  };
}

// ─── UniswapV2Router ──────────────────────────────────────────────────────────

export interface RouterContract {
  encodeSwapExactTokensForTokens(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: bigint
  ): string;
  encodeAddLiquidity(
    tokenA: string,
    tokenB: string,
    amountADesired: bigint,
    amountBDesired: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: string,
    deadline: bigint
  ): string;
  encodeRemoveLiquidity(
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: string,
    deadline: bigint
  ): string;
  encodeGetAmountsOut(amountIn: bigint, path: string[]): string;
  decodeGetAmountsOut(data: string): bigint[];
  decodeSwapResult(data: string): bigint[];
  decodeAddLiquidityResult(data: string): { amountA: bigint; amountB: bigint; liquidity: bigint };
  decodeRemoveLiquidityResult(data: string): { amountA: bigint; amountB: bigint };
}

export function uniswapV2Router(address: string): RouterContract & { address: string } {
  return {
    address,
    encodeSwapExactTokensForTokens: (amountIn, amountOutMin, path, to, deadline) =>
      ROUTER_IFACE.encodeFunctionData("swapExactTokensForTokens", [
        amountIn, amountOutMin, path, to, deadline,
      ]),
    encodeAddLiquidity: (tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline) =>
      ROUTER_IFACE.encodeFunctionData("addLiquidity", [
        tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline,
      ]),
    encodeRemoveLiquidity: (tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline) =>
      ROUTER_IFACE.encodeFunctionData("removeLiquidity", [
        tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline,
      ]),
    encodeGetAmountsOut: (amountIn, path) =>
      ROUTER_IFACE.encodeFunctionData("getAmountsOut", [amountIn, path]),
    decodeGetAmountsOut: (data) =>
      Array.from(decodeResult(ROUTER_IFACE, "getAmountsOut", data)[0] as bigint[]).map(BigInt),
    decodeSwapResult: (data) =>
      Array.from(decodeResult(ROUTER_IFACE, "swapExactTokensForTokens", data)[0] as bigint[]).map(BigInt),
    decodeAddLiquidityResult: (data) => {
      const r = decodeResult(ROUTER_IFACE, "addLiquidity", data);
      return { amountA: BigInt(r[0]), amountB: BigInt(r[1]), liquidity: BigInt(r[2]) };
    },
    decodeRemoveLiquidityResult: (data) => {
      const r = decodeResult(ROUTER_IFACE, "removeLiquidity", data);
      return { amountA: BigInt(r[0]), amountB: BigInt(r[1]) };
    },
  };
}

// ─── UniswapV2Factory ─────────────────────────────────────────────────────────

export interface FactoryContract {
  encodeGetPair(tokenA: string, tokenB: string): string;
  decodeGetPair(data: string): string;
  encodeAllPairs(index: bigint): string;
  decodeAllPairs(data: string): string;
  encodeAllPairsLength(): string;
  decodeAllPairsLength(data: string): bigint;
}

export function uniswapV2Factory(address: string): FactoryContract & { address: string } {
  return {
    address,
    encodeGetPair: (tokenA, tokenB) =>
      FACTORY_IFACE.encodeFunctionData("getPair", [tokenA, tokenB]),
    decodeGetPair: (data) => String(decodeResult(FACTORY_IFACE, "getPair", data)[0]),
    encodeAllPairs: (index) =>
      FACTORY_IFACE.encodeFunctionData("allPairs", [index]),
    decodeAllPairs: (data) => String(decodeResult(FACTORY_IFACE, "allPairs", data)[0]),
    encodeAllPairsLength: () => FACTORY_IFACE.encodeFunctionData("allPairsLength", []),
    decodeAllPairsLength: (data) => BigInt(decodeResult(FACTORY_IFACE, "allPairsLength", data)[0]),
  };
}

// ─── UniswapV2Pair ────────────────────────────────────────────────────────────

export interface PairReserves {
  reserve0: bigint;
  reserve1: bigint;
  blockTimestampLast: number;
}

export interface PairContract {
  encodeGetReserves(): string;
  decodeGetReserves(data: string): PairReserves;
  encodeToken0(): string;
  decodeToken0(data: string): string;
  encodeToken1(): string;
  decodeToken1(data: string): string;
  encodeTotalSupply(): string;
  decodeTotalSupply(data: string): bigint;
}

export function uniswapV2Pair(address: string): PairContract & { address: string } {
  return {
    address,
    encodeGetReserves: () => PAIR_IFACE.encodeFunctionData("getReserves", []),
    decodeGetReserves: (data) => {
      const r = decodeResult(PAIR_IFACE, "getReserves", data);
      return {
        reserve0: BigInt(r[0]),
        reserve1: BigInt(r[1]),
        blockTimestampLast: Number(r[2]),
      };
    },
    encodeToken0: () => PAIR_IFACE.encodeFunctionData("token0", []),
    decodeToken0: (data) => String(decodeResult(PAIR_IFACE, "token0", data)[0]),
    encodeToken1: () => PAIR_IFACE.encodeFunctionData("token1", []),
    decodeToken1: (data) => String(decodeResult(PAIR_IFACE, "token1", data)[0]),
    encodeTotalSupply: () => PAIR_IFACE.encodeFunctionData("totalSupply", []),
    decodeTotalSupply: (data) => BigInt(decodeResult(PAIR_IFACE, "totalSupply", data)[0]),
  };
}

// ─── Aave Pool ────────────────────────────────────────────────────────────────

export interface UserAccountData {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}

export interface AavePoolContract {
  encodeSupply(asset: string, amount: bigint, onBehalfOf: string, referralCode?: number): string;
  encodeBorrow(asset: string, amount: bigint, interestRateMode: number, referralCode: number, onBehalfOf: string): string;
  encodeRepay(asset: string, amount: bigint, interestRateMode: number, onBehalfOf: string): string;
  encodeWithdraw(asset: string, amount: bigint, to: string): string;
  encodeGetUserAccountData(user: string): string;
  decodeGetUserAccountData(data: string): UserAccountData;
  encodeGetReserveData(asset: string): string;
  // Reserve data is complex — return raw result array
  decodeGetReserveData(data: string): Result;
}

/** 
 * Interest rate mode: 1 = stable, 2 = variable 
 * IGRA lending uses variable (2) by default
 */
export const INTEREST_RATE_MODE = { STABLE: 1, VARIABLE: 2 } as const;

export function aavePool(address: string): AavePoolContract & { address: string } {
  return {
    address,
    encodeSupply: (asset, amount, onBehalfOf, referralCode = 0) =>
      AAVE_POOL_IFACE.encodeFunctionData("supply", [asset, amount, onBehalfOf, referralCode]),
    encodeBorrow: (asset, amount, interestRateMode, referralCode, onBehalfOf) =>
      AAVE_POOL_IFACE.encodeFunctionData("borrow", [asset, amount, interestRateMode, referralCode, onBehalfOf]),
    encodeRepay: (asset, amount, interestRateMode, onBehalfOf) =>
      AAVE_POOL_IFACE.encodeFunctionData("repay", [asset, amount, interestRateMode, onBehalfOf]),
    encodeWithdraw: (asset, amount, to) =>
      AAVE_POOL_IFACE.encodeFunctionData("withdraw", [asset, amount, to]),
    encodeGetUserAccountData: (user) =>
      AAVE_POOL_IFACE.encodeFunctionData("getUserAccountData", [user]),
    decodeGetUserAccountData: (data) => {
      const r = decodeResult(AAVE_POOL_IFACE, "getUserAccountData", data);
      return {
        totalCollateralBase: BigInt(r[0]),
        totalDebtBase: BigInt(r[1]),
        availableBorrowsBase: BigInt(r[2]),
        currentLiquidationThreshold: BigInt(r[3]),
        ltv: BigInt(r[4]),
        healthFactor: BigInt(r[5]),
      };
    },
    encodeGetReserveData: (asset) =>
      AAVE_POOL_IFACE.encodeFunctionData("getReserveData", [asset]),
    decodeGetReserveData: (data) =>
      decodeResult(AAVE_POOL_IFACE, "getReserveData", data),
  };
}

// ─── WrappedTokenGateway ──────────────────────────────────────────────────────

export interface WrappedGatewayContract {
  /** depositETH is payable — value sent as native token */
  encodeDepositETH(pool: string, onBehalfOf: string, referralCode?: number): string;
  encodeWithdrawETH(pool: string, amount: bigint, to: string): string;
}

export function wrappedTokenGateway(address: string): WrappedGatewayContract & { address: string } {
  return {
    address,
    encodeDepositETH: (pool, onBehalfOf, referralCode = 0) =>
      WRAPPED_GATEWAY_IFACE.encodeFunctionData("depositETH", [pool, onBehalfOf, referralCode]),
    encodeWithdrawETH: (pool, amount, to) =>
      WRAPPED_GATEWAY_IFACE.encodeFunctionData("withdrawETH", [pool, amount, to]),
  };
}

// ─── Batch call helper ────────────────────────────────────────────────────────

/**
 * Make multiple eth_call reads in parallel
 */
export async function multicall(
  rpc: RpcClient,
  calls: Array<{ to: string; data: string }>
): Promise<string[]> {
  return Promise.all(calls.map((c) => rpc.ethCall(c.to, c.data)));
}

// ─── Unit conversion helpers ──────────────────────────────────────────────────

/**
 * Convert human-readable amount to wei (smallest unit)
 * e.g. toWei("1.5", 6) → 1_500_000n  (for USDC)
 */
export function toWei(amount: string, decimals: number): bigint {
  const [whole, frac = ""] = amount.split(".");
  const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + fracPadded);
}

/**
 * Convert wei to human-readable string
 * e.g. fromWei(1_500_000n, 6) → "1.5"
 */
export function fromWei(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

/**
 * Add a slippage tolerance to an amount (returns floor with slippage removed)
 * e.g. withSlippage(1000n, 0.5) → 995n  (0.5% slippage)
 */
export function withSlippage(amount: bigint, slippagePct: number): bigint {
  const slippageBps = BigInt(Math.round(slippagePct * 100));
  return (amount * (10_000n - slippageBps)) / 10_000n;
}

/**
 * Deadline = now + seconds
 */
export function deadlineFromNow(seconds: number = 1200): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}
