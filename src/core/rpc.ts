/**
 * rpc.ts — Raw JSON-RPC client using fetch().
 *
 * Rules:
 * - No ethers Provider — we do our own RPC calls
 * - MIN gas price enforced: 2_000_000_001n (IGRA mempool quirk)
 * - eth_estimateGas is unreliable — use static GAS_LIMITS from contracts.ts
 * - No side effects on import
 */

import { MIN_GAS_PRICE } from "./contracts.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

export class RpcCallError extends Error {
  readonly code: number;
  readonly rpcMessage: string;
  readonly data?: string;

  constructor(code: number, message: string, data?: string) {
    super(
      `RPC error ${code}: ${message}` +
        (data ? ` (data: ${data})` : "")
    );
    this.name = "RpcCallError";
    this.code = code;
    this.rpcMessage = message;
    this.data = data;
  }
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: string;
  blockHash: string;
  status: string; // "0x1" = success, "0x0" = revert
  gasUsed: string;
  effectiveGasPrice: string;
  from: string;
  to: string | null;
  contractAddress: string | null;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
    logIndex: string;
  }>;
}

export interface RpcClientConfig {
  rpcUrl: string;
  timeout?: number; // ms, default 30_000
}

// ─── RPC Client ───────────────────────────────────────────────────────────────

export class RpcClient {
  private readonly url: string;
  private readonly timeout: number;
  private requestId = 1;

  constructor(config: RpcClientConfig) {
    this.url = config.rpcUrl;
    this.timeout = config.timeout ?? 30_000;
  }

  // ─── Core JSON-RPC transport ────────────────────────────────────────────────

  private async call<T>(method: string, params: unknown[]): Promise<T> {
    const id = this.requestId++;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`RPC timeout after ${this.timeout}ms: ${method}`);
      }
      throw new Error(`RPC fetch failed: ${String(err)}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`RPC HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json() as {
      result?: T;
      error?: RpcError;
      id: number;
    };

    if (json.error) {
      const errorData = typeof json.error.data === "string"
        ? json.error.data
        : undefined;
      throw new RpcCallError(json.error.code, json.error.message, errorData);
    }

    return json.result as T;
  }

  // ─── Public RPC methods ─────────────────────────────────────────────────────

  /**
   * eth_call — read-only contract call, returns hex data
   */
  async ethCall(
    to: string,
    data: string,
    blockTag: string = "latest"
  ): Promise<string> {
    return this.call<string>("eth_call", [{ to, data }, blockTag]);
  }

  /**
   * eth_sendRawTransaction — broadcast a signed transaction, returns tx hash
   */
  async sendRawTransaction(signedTx: string): Promise<string> {
    return this.call<string>("eth_sendRawTransaction", [signedTx]);
  }

  /**
   * eth_getBalance — returns native balance in wei as BigInt
   */
  async getBalance(address: string, blockTag: string = "latest"): Promise<bigint> {
    const hex = await this.call<string>("eth_getBalance", [address, blockTag]);
    return BigInt(hex);
  }

  /**
   * eth_getTransactionReceipt — returns null if not yet mined
   */
  async getTransactionReceipt(
    hash: string
  ): Promise<TransactionReceipt | null> {
    return this.call<TransactionReceipt | null>(
      "eth_getTransactionReceipt",
      [hash]
    );
  }

  /**
   * eth_blockNumber — returns current block number as BigInt
   */
  async getBlockNumber(): Promise<bigint> {
    const hex = await this.call<string>("eth_blockNumber", []);
    return BigInt(hex);
  }

  /**
   * eth_getTransactionCount — returns nonce for address as BigInt
   */
  async getTransactionCount(
    address: string,
    blockTag: string = "latest"
  ): Promise<bigint> {
    const hex = await this.call<string>("eth_getTransactionCount", [
      address,
      blockTag,
    ]);
    return BigInt(hex);
  }

  /**
   * eth_chainId — returns chain id as bigint
   */
  async getChainId(): Promise<bigint> {
    const hex = await this.call<string>("eth_chainId", []);
    return BigInt(hex);
  }

  // ─── Convenience helpers ────────────────────────────────────────────────────

  /**
   * Poll for tx receipt with retries. Throws if reverted or times out.
   */
  async waitForTransaction(
    hash: string,
    opts: { maxAttempts?: number; pollIntervalMs?: number } = {}
  ): Promise<TransactionReceipt> {
    const maxAttempts = opts.maxAttempts ?? 30;
    const pollIntervalMs = opts.pollIntervalMs ?? 2_000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const receipt = await this.getTransactionReceipt(hash);
      if (receipt !== null) {
        if (receipt.status === "0x0") {
          throw new Error(`Transaction reverted: ${hash}`);
        }
        return receipt;
      }
      await sleep(pollIntervalMs);
    }

    throw new Error(
      `Transaction not mined after ${maxAttempts * pollIntervalMs}ms: ${hash}`
    );
  }
}

// ─── Gas helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the minimum valid gas price for IGRA.
 * eth_gasPrice is unreliable — always use this floor.
 */
export function getMinGasPrice(): bigint {
  return MIN_GAS_PRICE;
}

/**
 * Format gas price hint for transaction objects (hex string)
 */
export function formatGasPrice(gwei?: bigint): string {
  return "0x" + (gwei ?? MIN_GAS_PRICE).toString(16);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create an RpcClient from a NetworkConfig or plain RPC URL
 */
export function createRpcClient(rpcUrlOrConfig: string | RpcClientConfig): RpcClient {
  if (typeof rpcUrlOrConfig === "string") {
    return new RpcClient({ rpcUrl: rpcUrlOrConfig });
  }
  return new RpcClient(rpcUrlOrConfig);
}
