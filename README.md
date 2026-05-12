# jitsu-playground

[![npm version](https://img.shields.io/npm/v/jitsu-playground.svg)](https://www.npmjs.com/package/jitsu-playground)
[![license](https://img.shields.io/npm/l/jitsu-playground.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/jitsu-playground.svg)](https://nodejs.org)

A local debugging playground for [Jitsu](https://jitsu.com) transformation functions. Run and inspect your function pipeline in a browser UI before deploying.

---

## Features

- **Visual pipeline builder** — compose ordered transformation steps from your local `.ts` files
- **Live execution** — run the full pipeline against any JSON payload and see step-by-step results
- **Environment variables** — inject `KEY=VALUE` pairs directly into each run
- **Geo context** — simulate geo-enriched events with an optional JSON geo block
- **Per-step results** — status badge (passed / dropped / error), output diff, and structured logs (info / warn / error / debug)
- **Keyboard shortcut** — `Cmd+Enter` / `Ctrl+Enter` to run the pipeline instantly
- **Zero config** — points at `./src/functions` by default, works with any project structure

---

## Installation

Install globally to use from any project:

```sh
npm install -g jitsu-playground
# or
pnpm add -g jitsu-playground
```

Or run without installing:

```sh
npx jitsu-playground
```

---

## Usage

```sh
jitsu-playground [options]
```

| Option | Alias | Default | Description |
|---|---|---|---|
| `--dir <path>` | `-d` | `./src/functions` | Path to the directory containing your `.ts` function files |
| `--port <port>` | `-p` | `3333` | Port to start the local server on |
| `--help` | `-h` | — | Print help and exit |

### Examples

```sh
# Start with defaults (./src/functions on port 3333)
jitsu-playground

# Custom directory and port
jitsu-playground --dir src/functions --port 4000

# Subdirectory of functions
jitsu-playground --dir src/functions/dashboard
```

Then open **http://localhost:3333** in your browser.

---

## How it works

Each file in your functions directory should export a default async function conforming to the Jitsu function signature:

```ts
export const config = {
  name: "My Transform",
  slug: "my-transform",
};

export default async function myTransform(event, ctx) {
  // Return a modified event, or return "drop" to discard it
  return {
    ...event,
    custom_prop: "value",
  };
}
```

`jitsu-playground` discovers all `.ts` files in your functions directory, presents them as pipeline steps in the UI, and executes them in order against the input payload you provide. Each step receives the output of the previous one.

---

## Requirements

- Node.js ≥ 18
- [`jiti`](https://github.com/unjs/jiti) ≥ 2.0.0 (peer dependency — already installed if you use Jitsu's SDK)

---

## License

MIT © [Hazem Khaled](https://hazemkhaled.com)
