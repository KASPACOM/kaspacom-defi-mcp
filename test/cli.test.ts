import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalArgv = [...process.argv];

async function flushCli() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("CLI behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.argv = [...originalArgv];
  });

  afterEach(() => {
    process.argv = [...originalArgv];
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("passes parsed read command arguments to executeReadTool and emits json", async () => {
    const getNetwork = vi.fn().mockReturnValue({ name: "igra", chainId: 38833 });
    const executeReadTool = vi.fn().mockResolvedValue({
      ok: true,
      network: "igra",
      data: { total: 1, pairs: [] },
    });
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    vi.doMock("../src/core/contracts.js", () => ({ getNetwork }));
    vi.doMock("../src/core/tools/index.js", () => ({ executeReadTool }));

    process.argv = [
      "node",
      "kaspacom-defi",
      "--network",
      "igra",
      "--json",
      "getPairs",
      "--limit",
      "7",
    ];

    await import("../src/cli/index.ts");
    await flushCli();

    expect(getNetwork).toHaveBeenCalledWith("igra");
    expect(executeReadTool).toHaveBeenCalledWith(
      "getPairs",
      { limit: 7, network: "igra" },
      { name: "igra", chainId: 38833 }
    );
    expect(consoleLog).toHaveBeenCalledWith(
      JSON.stringify({ ok: true, network: "igra", data: { total: 1, pairs: [] } }, null, 2)
    );
  });

  it("blocks write commands without a wallet before attempting execution", async () => {
    const getNetwork = vi.fn().mockReturnValue({ name: "galleon", chainId: 38836 });
    const executeReadTool = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rejection = new Promise<unknown>((resolve) => {
      const handler = (reason: unknown) => {
        process.off("unhandledRejection", handler);
        resolve(reason);
      };
      process.on("unhandledRejection", handler);
    });
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code ?? 0}`);
      }) as never);

    vi.doMock("../src/core/contracts.js", () => ({ getNetwork }));
    vi.doMock("../src/core/tools/index.js", () => ({ executeReadTool }));

    process.argv = [
      "node",
      "kaspacom-defi",
      "swap",
      "--in",
      "USDC",
      "--out",
      "WKAS",
      "--amount",
      "1",
    ];

    await import("../src/cli/index.ts");
    const reason = await rejection;

    expect(reason).toBeInstanceOf(Error);
    expect((reason as Error).message).toBe("process.exit:1");
    expect(consoleError).toHaveBeenCalledWith("Error: --wallet is required for swap");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(executeReadTool).not.toHaveBeenCalled();
  });
});
