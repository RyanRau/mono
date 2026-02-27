# flowrunner

A Go CLI that reads a flow JSON file, validates the DAG, executes each node in topological order, pipes outputs between nodes, and exits `0` on success or `1` on failure.

## Prerequisites

- Go 1.22+ (for local builds and testing)
- Docker (for container builds, optional)

## Getting started

All commands below assume you are in the `services/flow/` directory:

```bash
cd services/flow
```

### Build

```bash
go build -o flowrunner .
```

### Run

```bash
# Execute a flow
./flowrunner --flow examples/ping-flow.json

# Validate only — prints execution order without running anything
./flowrunner --flow examples/ping-flow.json --dry-run

# Read flow from stdin
cat examples/ping-flow.json | ./flowrunner --flow -

# Enable debug logging
./flowrunner --flow examples/ping-flow.json --log debug
```

### Build and run without a binary

```bash
go run . --flow examples/ping-flow.json
go run . --flow examples/ping-flow.json --dry-run
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--flow` | `/flow.json` | Path to the flow JSON file, or `-` for stdin |
| `--dry-run` | `false` | Validate and print execution order without running |
| `--log` | `info` | Log level: `info` or `debug` |

## Testing

### Run all tests

```bash
go test ./...
```

### Verbose output (see each test name)

```bash
go test ./... -v
```

### Run tests for a single package

```bash
go test ./flow/      # schema, validation, context, executor
go test ./nodes/     # script and HTTP runners
go test ./template/  # template resolution
```

### Run a specific test by name

```bash
go test ./flow/ -run TestValidate_CycleDetection
go test ./nodes/ -run TestHTTPRunner_POST_JSONBody
```

### Test coverage

```bash
# Print coverage summary per package
go test ./... -cover

# Generate an HTML coverage report
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

### What the tests cover

| Package | Tests | Covers |
|---------|-------|--------|
| `flow/` | 60 | JSON parsing, validation (required fields, unknown types, edge refs, cycle detection), RunContext (store/get, env, skip tracking, dot-path lookup), executor (topological sort, condition evaluation with all operators, execution loop, conditional skip/run, skip propagation, output formats), `formatDuration` |
| `nodes/` | 23 | Script runner (echo, args, stdin piping, failure, nonexistent cmd, cancellation, timeout, template resolution), HTTP runner (GET/POST, JSON/string body, headers, error codes, JSON fallback, template in URL/headers, cancellation, auto Content-Type) |
| `template/` | 13 | Placeholder resolution, whitespace, type formatting (string, float, binary, bool), unclosed braces, missing paths, adjacent placeholders |

## Docker

### Build the image

```bash
docker build -t flowrunner .
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
