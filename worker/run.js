#!/usr/bin/env node
/**
 * 从仓库根目录启动 worker，避免部署平台（如 Render）把 cwd 设为 src 导致找不到 worker/serve.ts
 */
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
process.chdir(repoRoot);

const result = spawnSync("npx", ["tsx", "worker/serve.ts"], {
  stdio: "inherit",
  shell: true,
  cwd: repoRoot,
  env: process.env,
});

process.exit(result.status ?? 1);
