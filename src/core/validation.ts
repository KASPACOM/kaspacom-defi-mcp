import { CANONICAL_NETWORK_NAMES, getNetwork } from "./contracts.js";

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function parseCliNetwork(name: string): string {
  try {
    return getNetwork(name).name;
  } catch {
    throw new Error(
      `Invalid network "${name}". Use one of: ${CANONICAL_NETWORK_NAMES.join(", ")}`
    );
  }
}

export function assertAddress(value: string, fieldName = "address"): string {
  if (!EVM_ADDRESS_REGEX.test(value)) {
    throw new Error(
      `Invalid ${fieldName}: "${value}". Expected a 0x-prefixed 40-byte hex address.`
    );
  }
  return value;
}

export function isAddressField(fieldName: string): boolean {
  return ["address", "launchId"].includes(fieldName);
}
