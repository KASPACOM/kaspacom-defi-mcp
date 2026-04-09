import { describe, expect, it, vi } from "vitest";
import { handleCallTool } from "../src/mcp/index.js";

describe("MCP CallTool handler", () => {
  it("returns an explicit error for write tools without MCP_WALLET_KEY", async () => {
    const executeReadTool = vi.fn();

    const result = await handleCallTool(
      {
        params: {
          name: "swap",
          arguments: { tokenIn: "USDC", tokenOut: "WKAS", amountIn: "1" },
        },
      },
      {
        walletKey: undefined,
        defaultNetworkName: "galleon",
        readToolExecutor: executeReadTool as never,
      },
    );

    expect(result.isError).toBe(true);
    expect(executeReadTool).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text)).toEqual({
      error: 'Tool "swap" requires a wallet. Set MCP_WALLET_KEY environment variable.',
      tool: "swap",
    });
  });

  it("executes read tools and returns ok JSON payloads", async () => {
    const executeReadTool = vi.fn().mockResolvedValue({
      ok: true,
      network: "galleon",
      data: { total: 1, pairs: [] },
    });

    const result = await handleCallTool(
      {
        params: {
          name: "getPairs",
          arguments: { limit: 5, network: "galleon" },
        },
      },
      {
        walletKey: undefined,
        defaultNetworkName: "galleon",
        readToolExecutor: executeReadTool as never,
      },
    );

    expect(executeReadTool).toHaveBeenCalledWith(
      "getPairs",
      { limit: 5, network: "galleon" },
      expect.objectContaining({ name: "galleon", chainId: 38836 }),
    );
    expect(result.isError).toBe(false);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      ok: true,
      network: "galleon",
      data: { total: 1, pairs: [] },
    });
  });

  it("returns not_implemented for unknown tools", async () => {
    const executeReadTool = vi.fn().mockResolvedValue(null);

    const result = await handleCallTool(
      {
        params: {
          name: "mysteryTool",
          arguments: { network: "kasplex" },
        },
      },
      {
        walletKey: undefined,
        defaultNetworkName: "galleon",
        readToolExecutor: executeReadTool as never,
      },
    );

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      tool: "mysteryTool",
      network: "kasplex",
      chainId: 202555,
      status: "not_implemented",
    });
  });

  it("rejects malformed address parameters before tool execution", async () => {
    const executeReadTool = vi.fn();

    const result = await handleCallTool(
      {
        params: {
          name: "getPosition",
          arguments: { address: "bad-address", network: "galleon" },
        },
      },
      {
        walletKey: undefined,
        defaultNetworkName: "galleon",
        readToolExecutor: executeReadTool as never,
      },
    );

    expect(result.isError).toBe(true);
    expect(executeReadTool).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text)).toEqual({
      error: 'Error: Invalid address: "bad-address". Expected a 0x-prefixed 40-byte hex address.',
      tool: "getPosition",
    });
  });
});
