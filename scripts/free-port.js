#!/usr/bin/env node
// Frees `port` if a leftover Node process (e.g. an orphaned Metro from a run
// that got killed abruptly) is holding it. Exits non-zero, printing the PID,
// if the port is held by something else.
const { execFileSync } = require("child_process");

const port = process.argv[2];
if (!port) {
  console.error("Usage: free-port.js <port>");
  process.exit(1);
}

const isWindows = process.platform === "win32";

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" });
  } catch {
    return null;
  }
}

function findPid() {
  if (isWindows) {
    const out = run("netstat", ["-ano", "-p", "tcp"]);
    if (!out) return null;
    const line = out
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /LISTENING/.test(l) && new RegExp(`[:.]${port}\\s`).test(l));
    if (!line) return null;
    const parts = line.split(/\s+/);
    return parts[parts.length - 1];
  }
  const out = run("lsof", ["-ti", `tcp:${port}`]);
  if (!out) return null;
  return out.split("\n").map((l) => l.trim()).find(Boolean) || null;
}

function processName(pid) {
  if (isWindows) {
    const out = run("tasklist", ["/FI", `PID eq ${pid}`, "/NH", "/FO", "CSV"]);
    if (!out) return null;
    const line = out.split("\n").map((l) => l.trim()).find(Boolean);
    const match = line && line.match(/^"([^"]+)"/);
    return match ? match[1] : null;
  }
  const out = run("ps", ["-p", pid, "-o", "comm="]);
  return out ? out.trim() : null;
}

const pid = findPid();
if (!pid) process.exit(0);

const name = processName(pid) || "";
if (!/node/i.test(name)) {
  console.error(
    `Port ${port} is in use by PID ${pid} (${name || "unknown process"}), not a leftover dev server — free it manually and retry.`
  );
  process.exit(1);
}

console.error(`[dev.sh] Port ${port} is held by a leftover Metro process (PID ${pid}) — stopping it.`);
if (isWindows) {
  run("taskkill", ["/PID", pid, "/F"]);
} else {
  try {
    process.kill(Number(pid), "SIGKILL");
  } catch {
    // already gone
  }
}
