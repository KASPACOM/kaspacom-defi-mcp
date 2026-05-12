import type { NetworkConfig } from "../contracts.js";
import { RpcCallError, type RpcClient } from "../rpc.js";
import {
  aavePool,
  uiDataProviderWrapper,
  type KaskadPriceUpdate,
  type UserAccountData,
} from "../typed-contracts.js";

interface KaskadRelayerPrice {
  asset_id: string;
  price: string;
  timestamp: number | string;
  num_sources: number | string;
  sources_hash: string;
  signature: string;
}

interface KaskadRelayerResponse {
  prices?: KaskadRelayerPrice[];
}

const HEX_32_RE = /^0x[0-9a-fA-F]{64}$/;
const HEX_RE = /^0x[0-9a-fA-F]*$/;

/**
 * getUserAccountData on Galleon Aave can revert with StalePrice when called
 * directly. When the UiDataProviderWrapper/Kaskad relayer config is present,
 * fetch fresh signed prices, simulate updates through the wrapper, and decode
 * the ResultData(bytes) revert payload that contains Pool.getUserAccountData.
 */
export async function getFreshUserAccountData(
  network: NetworkConfig,
  rpcClient: RpcClient,
  wallet: string
): Promise<UserAccountData> {
  const pool = aavePool(network.contracts.lending.pool);
  const wrapperAddress = network.contracts.lending.uiDataProviderWrapper;
  const relayerUrl = network.contracts.lending.kaskadEnclaveApiUrl;
  const poolAddressesProvider = network.contracts.lending.poolAddressesProvider;

  const hasAnyKaskadConfig = Boolean(
    network.contracts.lending.kaskadPriceOracle ||
      network.contracts.lending.kaskadRouter ||
      wrapperAddress ||
      relayerUrl
  );
  const hasFullKaskadReadConfig = Boolean(wrapperAddress && relayerUrl && poolAddressesProvider);

  if (!hasFullKaskadReadConfig) {
    if (hasAnyKaskadConfig) {
      throw new Error(
        "Kaskad oracle is configured but uiDataProviderWrapper, kaskadEnclaveApiUrl, " +
          "or poolAddressesProvider is missing; refusing stale direct getUserAccountData"
      );
    }

    const accountDataHex = await rpcClient.ethCall(
      pool.address,
      pool.encodeGetUserAccountData(wallet)
    );
    return pool.decodeGetUserAccountData(accountDataHex);
  }

  const updates = await fetchKaskadPriceUpdates(relayerUrl!);
  const wrapper = uiDataProviderWrapper(wrapperAddress!);

  try {
    await rpcClient.ethCall(
      wrapper.address,
      wrapper.encodeGetUserAccountData(updates, poolAddressesProvider, wallet)
    );
  } catch (error: unknown) {
    const revertData = extractRevertData(error);
    if (!revertData) {
      throw error;
    }

    if (wrapper.isResultDataError(revertData)) {
      const accountDataHex = wrapper.decodeResultData(revertData);
      return pool.decodeGetUserAccountData(accountDataHex);
    }

    const knownWrapperError = wrapper.describeKnownError(revertData);
    if (knownWrapperError) {
      throw new Error(knownWrapperError);
    }

    throw error;
  }

  throw new Error("UiDataProviderWrapper.getUserAccountData unexpectedly returned without ResultData(bytes)");
}

export async function fetchKaskadPriceUpdates(apiUrl: string): Promise<KaskadPriceUpdate[]> {
  const url = new URL("/prices", apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Kaskad relayer ${url.toString()} returned HTTP ${response.status}`);
  }

  const json = await response.json() as KaskadRelayerResponse;
  if (!Array.isArray(json.prices)) {
    throw new Error("Kaskad relayer response missing prices array");
  }
  if (json.prices.length === 0) {
    throw new Error("Kaskad relayer response prices array is empty; refusing to call UiDataProviderWrapper without price updates");
  }

  return json.prices.map((price, index) => normalizeKaskadPriceUpdate(price, index));
}

function normalizeKaskadPriceUpdate(price: KaskadRelayerPrice, index: number): KaskadPriceUpdate {
  if (!HEX_32_RE.test(price.asset_id)) {
    throw new Error(`Kaskad price update ${index} has invalid asset_id`);
  }
  if (!HEX_32_RE.test(price.sources_hash)) {
    throw new Error(`Kaskad price update ${index} has invalid sources_hash`);
  }
  if (!HEX_RE.test(price.signature)) {
    throw new Error(`Kaskad price update ${index} has invalid signature`);
  }

  const numSources = Number(price.num_sources);
  if (!Number.isInteger(numSources) || numSources < 0 || numSources > 255) {
    throw new Error(`Kaskad price update ${index} has invalid num_sources`);
  }

  return {
    assetId: price.asset_id,
    price: BigInt(price.price),
    timestamp: BigInt(price.timestamp),
    numSources,
    sourcesHash: price.sources_hash,
    signature: price.signature,
  };
}

function extractRevertData(error: unknown): string | undefined {
  if (error instanceof RpcCallError && error.data) {
    return error.data;
  }

  if (error instanceof Error) {
    const match = error.message.match(/data: (0x[0-9a-fA-F]+)/);
    return match?.[1];
  }

  return undefined;
}
