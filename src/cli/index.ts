#!/usr/bin/env node
/**
 * KaspaCom DeFi CLI
 *
 * Phase 1: Command shell with all subcommands registered.
 * Implementations come in Phase 2.
 *
 * Usage:
 *   kaspacom-defi [command] [options]
 *
 * Global flags:
 *   --network  galleon|igra  (default: galleon)
 *   --wallet   path/to/keyfile or env var name
 *   --json     output raw JSON
 */

import { Command } from "commander";
import { getNetwork } from "../core/contracts.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function output(data: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === "string") {
    console.log(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function notImplemented(cmd: string, opts: Record<string, unknown>, json: boolean): void {
  const msg = {
    command: cmd,
    status: "not_implemented",
    message: `"${cmd}" is registered but not yet implemented. Phase 2 will add execution logic.`,
    options: opts,
  };
  output(json ? msg : `[not implemented] ${cmd}`, json);
}

// ─── Program ──────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("kaspacom-defi")
  .description("KaspaCom DeFi CLI — interact with DEX, Lending, and Launchpad on IGRA")
  .version("0.1.0")
  .option("-n, --network <name>", "Network: galleon (testnet) or igra (mainnet)", "galleon")
  .option("-w, --wallet <key>", "Private key or env var name for write operations")
  .option("-j, --json", "Output raw JSON", false);

// ─── DEX commands ─────────────────────────────────────────────────────────────

program
  .command("getPairs")
  .description("List all DEX liquidity pairs with reserves")
  .option("--limit <n>", "Max pairs to return", "20")
  .action((cmdOpts) => {
    const opts = program.opts();
    const net = getNetwork(opts.network as string);
    if (!opts.json) console.log(`Network: ${net.name} (chainId: ${net.chainId})`);
    notImplemented("getPairs", { ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

program
  .command("getTokenPrice <token>")
  .description("Get token price in USD or relative to another token")
  .option("--quote <symbol>", "Quote token symbol", "USDC")
  .action((token: string, cmdOpts) => {
    const opts = program.opts();
    notImplemented("getTokenPrice", { token, ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

program
  .command("swap")
  .description("Swap tokens via DEX router (requires --wallet)")
  .requiredOption("--in <symbol>", "Input token symbol")
  .requiredOption("--out <symbol>", "Output token symbol")
  .requiredOption("--amount <value>", "Amount of input token to swap")
  .option("--slippage <pct>", "Slippage tolerance %", "0.5")
  .action((cmdOpts) => {
    const opts = program.opts();
    if (!opts.wallet) {
      console.error("Error: --wallet is required for swap");
      process.exit(1);
    }
    notImplemented("swap", { ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

program
  .command("addLiquidity")
  .description("Add liquidity to a DEX pair (requires --wallet)")
  .requiredOption("--tokenA <symbol>", "First token symbol")
  .requiredOption("--tokenB <symbol>", "Second token symbol")
  .requiredOption("--amountA <value>", "Amount of tokenA")
  .requiredOption("--amountB <value>", "Amount of tokenB")
  .option("--slippage <pct>", "Slippage tolerance %", "0.5")
  .action((cmdOpts) => {
    const opts = program.opts();
    if (!opts.wallet) {
      console.error("Error: --wallet is required for addLiquidity");
      process.exit(1);
    }
    notImplemented("addLiquidity", { ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

program
  .command("removeLiquidity")
  .description("Remove liquidity from a DEX pair (requires --wallet)")
  .requiredOption("--tokenA <symbol>", "First token symbol")
  .requiredOption("--tokenB <symbol>", "Second token symbol")
  .requiredOption("--lp <amount>", "Amount of LP tokens to burn")
  .option("--slippage <pct>", "Slippage tolerance %", "0.5")
  .action((cmdOpts) => {
    const opts = program.opts();
    if (!opts.wallet) {
      console.error("Error: --wallet is required for removeLiquidity");
      process.exit(1);
    }
    notImplemented("removeLiquidity", { ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

// ─── Lending commands ─────────────────────────────────────────────────────────

program
  .command("getMarkets")
  .description("List all Aave lending markets with rates and TVL")
  .action((_cmdOpts) => {
    const opts = program.opts();
    notImplemented("getMarkets", { network: opts.network }, opts.json as boolean);
  });

program
  .command("getPosition [address]")
  .description("Get a wallet's lending position (health factor, supplied, borrowed)")
  .action((address: string | undefined, _cmdOpts) => {
    const opts = program.opts();
    const addr = address ?? "(from wallet key)";
    notImplemented("getPosition", { address: addr, network: opts.network }, opts.json as boolean);
  });

program
  .command("supply")
  .description("Supply tokens to the Aave lending pool (requires --wallet)")
  .requiredOption("--token <symbol>", "Token to supply")
  .requiredOption("--amount <value>", "Amount to supply")
  .action((cmdOpts) => {
    const opts = program.opts();
    if (!opts.wallet) {
      console.error("Error: --wallet is required for supply");
      process.exit(1);
    }
    notImplemented("supply", { ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

program
  .command("borrow")
  .description("Borrow tokens from the Aave lending pool (requires --wallet)")
  .requiredOption("--token <symbol>", "Token to borrow")
  .requiredOption("--amount <value>", "Amount to borrow")
  .action((cmdOpts) => {
    const opts = program.opts();
    if (!opts.wallet) {
      console.error("Error: --wallet is required for borrow");
      process.exit(1);
    }
    notImplemented("borrow", { ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

program
  .command("repay")
  .description("Repay borrowed tokens (requires --wallet). Use --amount max to repay all.")
  .requiredOption("--token <symbol>", "Token to repay")
  .requiredOption("--amount <value>", "Amount to repay, or 'max'")
  .action((cmdOpts) => {
    const opts = program.opts();
    if (!opts.wallet) {
      console.error("Error: --wallet is required for repay");
      process.exit(1);
    }
    notImplemented("repay", { ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

// ─── Launchpad commands ───────────────────────────────────────────────────────

program
  .command("getActiveLaunches")
  .description("List all active LFG Launchpad token launches")
  .action((_cmdOpts) => {
    const opts = program.opts();
    notImplemented("getActiveLaunches", { network: opts.network }, opts.json as boolean);
  });

program
  .command("buyLaunchToken")
  .description("Buy tokens from an LFG Launchpad launch (requires --wallet)")
  .requiredOption("--launch <id>", "Launch contract address or ID")
  .requiredOption("--payment <symbol>", "Payment token symbol (e.g. USDC)")
  .requiredOption("--amount <value>", "Amount of payment token to spend")
  .action((cmdOpts) => {
    const opts = program.opts();
    if (!opts.wallet) {
      console.error("Error: --wallet is required for buyLaunchToken");
      process.exit(1);
    }
    notImplemented("buyLaunchToken", { ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

program
  .command("sellLaunchToken")
  .description("Sell/refund tokens from an LFG launch (requires --wallet)")
  .requiredOption("--launch <id>", "Launch contract address or ID")
  .requiredOption("--amount <value>", "Amount of launch tokens to sell")
  .action((cmdOpts) => {
    const opts = program.opts();
    if (!opts.wallet) {
      console.error("Error: --wallet is required for sellLaunchToken");
      process.exit(1);
    }
    notImplemented("sellLaunchToken", { ...cmdOpts, network: opts.network }, opts.json as boolean);
  });

// ─── Portfolio commands ───────────────────────────────────────────────────────

program
  .command("getPortfolio [address]")
  .description("Get a complete portfolio summary: balances, LP positions, lending position")
  .action((address: string | undefined, _cmdOpts) => {
    const opts = program.opts();
    const addr = address ?? "(from wallet key)";
    notImplemented("getPortfolio", { address: addr, network: opts.network }, opts.json as boolean);
  });

// ─── Info commands ────────────────────────────────────────────────────────────

program
  .command("getProtocolInfo")
  .description("Show protocol overview: contracts, tokens, network details")
  .action((_cmdOpts) => {
    const opts = program.opts();
    const net = getNetwork(opts.network as string);
    if (opts.json) {
      output({
        network: net.name,
        chainId: net.chainId,
        rpc: net.rpc,
        explorer: net.explorer,
        contracts: net.contracts,
        tokens: Object.keys(net.tokens),
      }, true);
    } else {
      console.log(`\nKaspaCom DeFi Protocol — ${net.name} (chainId: ${net.chainId})`);
      console.log(`RPC:      ${net.rpc}`);
      console.log(`Explorer: ${net.explorer}`);
      console.log(`\nContracts:`);
      console.log(`  DEX Factory:    ${net.contracts.dex.factory}`);
      console.log(`  DEX Router:     ${net.contracts.dex.router}`);
      console.log(`  Aave Pool:      ${net.contracts.lending.pool}`);
      console.log(`\nTokens: ${Object.keys(net.tokens).join(", ")}`);
    }
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parse(process.argv);
