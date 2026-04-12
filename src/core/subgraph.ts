import type { NetworkConfig } from "./contracts.js";

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function querySubgraph<T>(
  url: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Subgraph HTTP ${response.status}: ${response.statusText}`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }
  if (!json.data) {
    throw new Error("Subgraph returned no data");
  }

  return json.data;
}

export function getDexSubgraphEndpoint(network: NetworkConfig): string {
  return `${network.subgraphUrl}/subgraphs/name/${network.dexSubgraphName}`;
}
