import express from "express";
import path from "path";
import fs from "fs";
import { createJiti } from "jiti";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  functionsDir: string;
  port: number;
}

interface PipelineStep {
  functionPath: string;
}

interface RunRequest {
  payload: Record<string, unknown>;
  geo?: Record<string, unknown>;
  envVars: Record<string, string>;
  pipeline: PipelineStep[];
}

interface StepResult {
  functionPath: string;
  name: string;
  status: "passed" | "dropped" | "error";
  output: unknown;
  logs: { level: string; message: string }[];
  durationMs: number;
}

function collectFunctionFiles(dir: string, base: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFunctionFiles(full, base));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(path.relative(base, full));
    }
  }
  return files;
}

export function startServer({ functionsDir, port }: ServerOptions): void {
  const app = express();
  const projectRoot = process.cwd();

  if (!fs.existsSync(functionsDir)) {
    console.error(`\n❌ Functions directory not found: ${functionsDir}`);
    console.error(`   Run from your project root or use --dir to specify the path.\n`);
    process.exit(1);
  }

  app.use(express.json());

  app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.get("/api/functions", async (_req, res) => {
    const jiti = createJiti(projectRoot, { debug: false, fsCache: false, moduleCache: false });
    const files = collectFunctionFiles(functionsDir, functionsDir);
    const result: { path: string; name: string; slug: string }[] = [];

    for (const file of files) {
      try {
        const mod = await jiti.import(path.join(functionsDir, file));
        const config = (mod as { config?: { name?: string; slug?: string } }).config;
        result.push({
          path: file,
          name: config?.name ?? file,
          slug: config?.slug ?? file,
        });
      } catch {
        // skip files that fail to import (type-only, util files, etc.)
      }
    }

    res.json(result);
  });

  app.post("/api/run", async (req, res) => {
    const { payload, geo, envVars, pipeline } = req.body as RunRequest;
    const results: StepResult[] = [];
    let current: unknown = payload;

    const jiti = createJiti(projectRoot, { debug: false, fsCache: false, moduleCache: false });

    // Inject shared envVars into process.env once for the whole pipeline run
    const savedEnv: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(envVars ?? {})) {
      savedEnv[k] = process.env[k];
      process.env[k] = v;
    }

    try {
      for (const step of pipeline) {
        const logs: { level: string; message: string }[] = [];
        const makeLogger =
          (level: string) =>
          (...args: unknown[]) =>
            logs.push({ level, message: args.map(String).join(" ") });

        const mockContext = {
          log: {
            info: makeLogger("info"),
            warn: makeLogger("warn"),
            error: makeLogger("error"),
            debug: makeLogger("debug"),
          },
          fetch: globalThis.fetch,
          store: {
            get: async () => undefined,
            set: async () => undefined,
            del: async () => undefined,
            ttl: async () => -1,
          },
          geo: geo ?? undefined,
          props: envVars ?? {},
          headers: {},
          source: { id: "playground", type: "s2s" as const, domain: "localhost" },
          destination: { id: "playground", type: "playground", hash: "playground" },
          connection: { id: "playground" },
          workspace: { id: "playground" },
          receivedAt: new Date(),
        };

        const start = Date.now();
        let status: StepResult["status"] = "passed";
        let output: unknown = null;
        let name = step.functionPath;

        try {
          const mod = await jiti.import(path.join(functionsDir, step.functionPath));
          const config = (mod as { config?: { name?: string } }).config;
          name = config?.name ?? step.functionPath;
          const fn = (mod as { default?: (...args: unknown[]) => unknown }).default;

          if (typeof fn !== "function") {
            throw new Error("No default export function found");
          }

          const result = await fn(current, mockContext);

          if (result === "drop") {
            status = "dropped";
            output = null;
          } else {
            status = "passed";
            output = result;
            current = result;
          }
        } catch (err) {
          status = "error";
          output = { error: String(err) };
          logs.push({ level: "error", message: String(err) });
        }

        results.push({
          functionPath: step.functionPath,
          name,
          status,
          output,
          logs,
          durationMs: Date.now() - start,
        });

        if (status === "dropped" || status === "error") break;
      }
    } finally {
      // Restore process.env after the whole pipeline
      for (const [k, original] of Object.entries(savedEnv)) {
        if (original === undefined) {
          delete process.env[k];
        } else {
          process.env[k] = original;
        }
      }
    }

    res.json(results);
  });

  app.listen(port, () => {
    console.log(`\n🎮 Jitsu Playground`);
    console.log(`   URL:       http://localhost:${port}`);
    console.log(`   Functions: ${functionsDir}\n`);
  });
}
