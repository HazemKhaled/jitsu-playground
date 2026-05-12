#!/usr/bin/env node
import path from "path";
import { startServer } from "./server.js";

function parseArgs(): { functionsDir: string; port: number } {
  const args = process.argv.slice(2);
  let functionsDir = path.join(process.cwd(), "src", "functions");
  let port = 3333;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--dir" || args[i] === "-d") && args[i + 1]) {
      functionsDir = path.resolve(process.cwd(), args[++i]);
    } else if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) {
      port = parseInt(args[++i], 10);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
Usage: jitsu-playground [options]

Options:
  --dir,  -d <path>   Path to functions directory (default: ./src/functions)
  --port, -p <port>   Port to listen on (default: 3333)
  --help, -h          Show this help message

Examples:
  jitsu-playground
  jitsu-playground --dir src/functions --port 4000
  jitsu-playground --dir src/functions/dashboard
`);
      process.exit(0);
    }
  }

  return { functionsDir, port };
}

const { functionsDir, port } = parseArgs();
startServer({ functionsDir, port });
