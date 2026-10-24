import { loadEnvConfig } from "@next/env";

import { getPool } from "../src/db";
import {
  FOLLOW_UP_INTERVAL_MINUTES,
  runGlobalFollowUpSweep,
} from "../src/server/agent-messages";

const WORKER_LOCK_KEY = 812_700_501;
const intervalMs = FOLLOW_UP_INTERVAL_MINUTES * 60_000;
const runOnce = process.argv.includes("--once");

loadEnvConfig(process.cwd());

const pool = getPool();

let running = false;
let timer: NodeJS.Timeout | undefined;

async function runTick() {
  if (running) return;
  running = true;
  let locked = false;
  try {
    const lockResult = await pool.query<{ locked: boolean }>(
      "select pg_try_advisory_lock($1) as locked",
      [WORKER_LOCK_KEY],
    );
    locked = lockResult.rows[0]?.locked === true;
    if (!locked) {
      console.log("Follow-up worker skipped: another worker holds the lock.");
      return;
    }

    const result = await runGlobalFollowUpSweep(new Date());
    console.log(
      `Follow-up worker checked all projects; created ${result.created} message${result.created === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    console.error(
      "Follow-up worker failed:",
      error instanceof Error ? error.message : error,
    );
    if (runOnce) process.exitCode = 1;
  } finally {
    if (locked) {
      await pool.query("select pg_advisory_unlock($1)", [WORKER_LOCK_KEY]);
    }
    running = false;
  }
}

async function shutdown(signal: string) {
  if (timer) clearInterval(timer);
  await pool.end();
  console.log(`Follow-up worker stopped (${signal}).`);
}

async function main() {
  await runTick();
  if (runOnce) {
    await pool.end();
    return;
  }

  console.log(
    `Follow-up worker running; checking every ${FOLLOW_UP_INTERVAL_MINUTES} minutes.`,
  );
  timer = setInterval(() => void runTick(), intervalMs);
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
