# flowrunner

A Go CLI that reads a flow JSON file, validates the DAG, executes each node in topological order, pipes outputs between nodes, and exits `0` on success or `1` on failure.

## Build

### Local

```bash
cd services/flow
go build -o flowrunner .
```

### Docker

```bash
cd services/flow
docker build -t flowrunner .
```

## Usage

```
flowrunner --flow <path>   (default: /flow.json)
flowrunner --flow -        (read from stdin)
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--flow` | `/flow.json` | Path to the flow JSON file, or `-` for stdin |
| `--dry-run` | `false` | Validate and print execution order without running |
| `--log` | `info` | Log level: `info` or `debug` |

### Run locally

```bash
# Execute a flow
./flowrunner --flow examples/ping-flow.json

# Validate only (no execution)
./flowrunner --flow examples/ping-flow.json --dry-run

# Read from stdin
cat examples/ping-flow.json | ./flowrunner --flow -

# Debug logging
./flowrunner --flow examples/ping-flow.json --log debug
```

### Run with Docker

The container expects the flow JSON mounted at `/flow.json`:

```bash
docker run --rm \
  -v $(pwd)/examples/ping-flow.json:/flow.json:ro \
  flowrunner
```

Hardened run (recommended for untrusted flows):

```bash
docker run --rm \
  --network none \
  --read-only \
  --tmpfs /tmp \
  --cap-drop ALL \
  --no-new-privileges \
  --memory 256m \
  --cpus 0.5 \
  --pids-limit 64 \
  -v $(pwd)/examples/ping-flow.json:/flow.json:ro \
  flowrunner
```

## Flow JSON schema

A flow defines nodes and edges. Nodes are executed in topological order; edges define data dependencies and optional conditions.

```json
{
  "id": "my-flow",
  "version": "1.0",
  "nodes": {
    "<node-id>": { ... }
  },
  "edges": [
    { "from": "<node-id>", "to": "<node-id>" }
  ]
}
```

### Node types

#### `script`

Runs a shell command. `command` and `args` support `{{...}}` templates.

```json
{
  "type": "script",
  "command": "echo",
  "args": ["hello {{env.USER}}"],
  "timeout_seconds": 60,
  "output": { "format": "text", "as": "greeting" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `command` | yes | Executable to run |
| `args` | no | Arguments array |
| `timeout_seconds` | no | Override default 5-minute timeout |

#### `http`

Makes an HTTP request. `url`, `headers`, and `body` support `{{...}}` templates.

```json
{
  "type": "http",
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": { "Authorization": "Bearer {{env.API_TOKEN}}" },
  "timeout_seconds": 10,
  "output": { "format": "json", "as": "result" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `url` | yes | Request URL |
| `method` | yes | HTTP method (`GET`, `POST`, etc.) |
| `headers` | no | Header key-value pairs |
| `body` | no | Request body — map (auto-marshalled to JSON) or string |
| `timeout_seconds` | no | Override default 30s timeout |

### Node output

Every node requires an `output` block:

```json
"output": {
  "format": "text",
  "as": "result"
}
```

- `format`: `"text"`, `"json"`, or `"binary"`
- `as`: name used to store the output (referenced by downstream nodes)

### Node input

Nodes can pull data from an upstream node's output:

```json
"input": {
  "from": "upstream-node-id",
  "field": "result",
  "via": "stdin_text"
}
```

| Field | Description |
|-------|-------------|
| `from` | Upstream node ID |
| `field` | Which output name to read from that node |
| `via` | How to pass data: `"stdin_text"` or `"stdin_binary"` |
| `from_any` | Array of node IDs — takes the first non-skipped output |

### Edges

Edges define execution order. An optional `condition` makes the edge conditional:

```json
{
  "from": "check-status",
  "to": "send-alert",
  "condition": {
    "field": "nodes.check-status.result.code",
    "op": "gt",
    "value": 400
  }
}
```

Supported operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`.

If a node only has conditional incoming edges and none evaluate to `true`, the node is skipped.

### Templating

Strings in `command`, `args`, `url`, `headers`, and `body` support placeholder resolution:

- `{{nodes.<node-id>.<output-name>}}` — value from a completed node
- `{{nodes.<node-id>.<output-name>.<subfield>}}` — drill into JSON output
- `{{env.<VAR>}}` — environment variable

## Example output

```
[flowrunner] starting node: ping-url
[flowrunner] node ping-url completed in 312ms
[flowrunner] starting node: format-result
[flowrunner] node format-result completed in 45ms
[flowrunner] flow completed in 357ms
```

## Project structure

```
services/flow/
├── main.go              # CLI entrypoint
├── flow/
│   ├── schema.go        # Flow + node types, JSON unmarshalling
│   ├── validate.go      # DAG validation, cycle detection
│   ├── executor.go      # Topological sort + execution loop
│   └── context.go       # Run context, node output store
├── nodes/
│   ├── runner.go        # Node runner interface
│   ├── script.go        # type: script
│   └── http.go          # type: http
├── template/
│   └── template.go      # {{...}} placeholder resolution
├── examples/
│   └── ping-flow.json   # Example flow
├── Dockerfile
└── go.mod
```
