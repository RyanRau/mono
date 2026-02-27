# Flow File Specification

This document defines the structure and validation rules for flow JSON files consumed by `flowrunner`.

## Overview

A flow file describes a directed acyclic graph (DAG) of executable nodes. Each node performs one unit of work (running a shell command or making an HTTP request), and edges define the execution order and optional conditions between them. Nodes run in topological order, and each node's output is available to downstream nodes via templating.

## Top-level structure

```json
{
  "id": "<string>",
  "version": "<string>",
  "nodes": { ... },
  "edges": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Identifier for the flow (informational) |
| `version` | string | no | Version string for the flow (informational) |
| `nodes` | object | yes | Map of node ID to node definition. Must contain at least one node. |
| `edges` | array | no | List of edges defining execution order and conditions. Defaults to `[]`. |

## Nodes

Nodes are defined as a JSON object where each key is the **node ID** and the value is the node definition. Node IDs must be unique (enforced by JSON object semantics).

```json
"nodes": {
  "my-node-id": {
    "type": "script",
    ...
  }
}
```

### Common fields (all node types)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | Node type. Must be `"script"` or `"http"`. |
| `timeout_seconds` | integer | no | Override the default timeout for this node. |
| `input` | object | no | Defines how this node receives data from an upstream node. See [Node input](#node-input). |
| `output` | object | yes | Defines how this node's result is stored. See [Node output](#node-output). |

### `script` node

Executes a shell command. Default timeout: **5 minutes**.

```json
{
  "type": "script",
  "command": "echo",
  "args": ["Hello, {{env.USER}}!"],
  "timeout_seconds": 60,
  "output": { "format": "text", "as": "greeting" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `command` | string | yes | Executable to run. Supports `{{...}}` templates. |
| `args` | array of strings | no | Command arguments. Each element supports `{{...}}` templates. |

**Behavior:**
- stdout is captured as the node's output
- stderr is streamed to the container's stderr (visible in logs)
- Non-zero exit code is treated as a failure
- If the node has an `input` with `via: "stdin_text"` or `via: "stdin_binary"`, the upstream output is piped to the command's stdin

### `http` node

Makes an HTTP request. Default timeout: **30 seconds**.

```json
{
  "type": "http",
  "url": "https://api.example.com/data",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer {{env.API_TOKEN}}",
    "Accept": "application/json"
  },
  "body": { "query": "{{nodes.prev-step.result}}" },
  "timeout_seconds": 10,
  "output": { "format": "json", "as": "api_response" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | yes | Request URL. Supports `{{...}}` templates. |
| `method` | string | yes | HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.). |
| `headers` | object | no | Key-value pairs for request headers. Values support `{{...}}` templates. |
| `body` | object or string | no | Request body. See below for handling. |

**Body handling:**
- If `body` is a JSON **object** (map): it is marshalled to JSON, templates within are resolved, and `Content-Type: application/json` is set automatically (unless a Content-Type header is already specified)
- If `body` is a **string**: templates are resolved and the result is sent as the raw body

**Response handling:**
- Non-2xx status codes (outside 200-299) are treated as errors
- If `output.format` is `"json"` and the response is not valid JSON, the output falls back to `"text"`

## Node output

Every node **must** have an `output` block.

```json
"output": {
  "format": "text",
  "as": "result"
}
```

| Field | Type | Required | Allowed values | Description |
|-------|------|----------|----------------|-------------|
| `format` | string | yes | `"text"`, `"json"`, `"binary"` | How to interpret and store the output. |
| `as` | string | yes | any non-empty string | Name under which the output is stored. Referenced by downstream nodes via `{{nodes.<node-id>.<as-value>}}`. |

**Format behavior:**

| Format | Storage type | Notes |
|--------|-------------|-------|
| `text` | string | Trailing newlines are trimmed. |
| `json` | parsed object | Stored as a nested structure. Fields are accessible via dot paths (e.g., `{{nodes.api.result.data.name}}`). Falls back to text if parsing fails. |
| `binary` | raw bytes | Rendered as `[binary data]` when referenced in templates. |

## Node input

An optional block that pulls data from an upstream node's output into this node.

```json
"input": {
  "from": "upstream-node-id",
  "field": "result",
  "via": "stdin_text"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | conditional | ID of the upstream node to read from. Required if `from_any` is not set. |
| `field` | string | yes | The `output.as` name to read from the upstream node. |
| `via` | string | no | How to deliver the data. `"stdin_text"` or `"stdin_binary"` (pipes to command stdin). |
| `from_any` | array of strings | conditional | List of node IDs. Takes the output from the first non-skipped node. Use instead of `from`. |

**Rules:**
- Use `from` for a single, known upstream node
- Use `from_any` when multiple branches may or may not execute (e.g., after conditional edges) — the first available result is used

## Edges

Edges define execution dependencies. A node will not run until all nodes connected to it via incoming edges have completed (or been skipped).

```json
"edges": [
  { "from": "step-a", "to": "step-b" },
  {
    "from": "check",
    "to": "alert",
    "condition": {
      "field": "nodes.check.result.status",
      "op": "gt",
      "value": 400
    }
  }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | yes | Source node ID. Must exist in `nodes`. |
| `to` | string | yes | Target node ID. Must exist in `nodes`. |
| `condition` | object | no | If present, the edge only activates when the condition is true. See [Conditions](#conditions). |

**Execution rules:**
- Edges without conditions are **unconditional** — the target node runs as soon as the source completes
- If a node has **only conditional** incoming edges and **none** evaluate to true, the node is **skipped**
- If a node's incoming edges come from **skipped** nodes (no conditions), the node is also skipped (skip propagation)

## Conditions

Conditions evaluate a value from the run context against a specified operand.

```json
"condition": {
  "field": "nodes.check.result.status_code",
  "op": "gte",
  "value": 400
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field` | string | yes | Dot-path to the value to test. Uses the same syntax as templates (e.g., `nodes.<id>.<output>` or `nodes.<id>.<output>.<subfield>`). |
| `op` | string | yes | Comparison operator. See table below. |
| `value` | any | yes | The value to compare against. |

### Operators

| Operator | Description | Operand types |
|----------|-------------|---------------|
| `eq` | Equal (string comparison) | any |
| `ne` | Not equal (string comparison) | any |
| `gt` | Greater than | numeric |
| `gte` | Greater than or equal | numeric |
| `lt` | Less than | numeric |
| `lte` | Less than or equal | numeric |
| `contains` | String contains substring | string |

**Notes:**
- `eq` and `ne` compare the string representation of both sides
- Numeric operators (`gt`, `gte`, `lt`, `lte`) convert both sides to `float64`. String values like `"42.5"` are parsed as numbers.
- `contains` converts both sides to strings and checks if the field value contains the comparison value as a substring

## Templating

String fields in nodes (`command`, `args`, `url`, `headers` values, `body` strings) support placeholder resolution using `{{ }}` syntax.

### Syntax

```
{{nodes.<node-id>.<output-name>}}
{{nodes.<node-id>.<output-name>.<subfield>.<deeper>}}
{{env.<VARIABLE_NAME>}}
```

Whitespace inside braces is trimmed: `{{ env.HOME }}` is equivalent to `{{env.HOME}}`.

### Node output references

Access outputs from previously executed nodes:

```
{{nodes.fetch-data.result}}           → the "result" output of node "fetch-data"
{{nodes.api-call.response.data.id}}   → drill into a JSON output's nested fields
```

- The node must have already executed (guaranteed by topological ordering)
- Referencing a node that hasn't run yet is an error
- Binary outputs resolve to the literal string `[binary data]`

### Environment variables

Access environment variables available in the container:

```
{{env.HOME}}
{{env.API_KEY}}
```

- Referencing a non-existent environment variable is an error

### Type formatting in templates

| Value type | Rendered as |
|------------|-------------|
| string | as-is |
| float64 (whole) | integer format, e.g., `42` |
| float64 (decimal) | decimal format, e.g., `3.14` |
| []byte (binary) | `[binary data]` |
| other | Go default format (`%v`) |

## Validation rules

The following rules are enforced before execution. Validation fails with descriptive error messages.

1. **Node type** — must be `"script"` or `"http"`
2. **Script nodes** — `command` is required
3. **HTTP nodes** — `url` and `method` are required
4. **Output** — `output.as` must be non-empty on every node
5. **Edge references** — `from` and `to` must reference node IDs that exist in `nodes`
6. **Conditions** — if present, `field` and `op` must be non-empty
7. **No cycles** — the graph formed by edges must be a valid DAG (directed acyclic graph)

You can validate a flow without executing it using:

```bash
flowrunner --flow my-flow.json --dry-run
```

## Complete example

```json
{
  "id": "ping-flow",
  "version": "1.0",
  "nodes": {
    "ping-url": {
      "type": "http",
      "url": "https://httpbin.org/get",
      "method": "GET",
      "headers": {
        "User-Agent": "flowrunner/1.0"
      },
      "output": {
        "format": "json",
        "as": "result"
      }
    },
    "format-result": {
      "type": "script",
      "command": "echo",
      "args": ["Ping response origin: {{nodes.ping-url.result.origin}}"],
      "output": {
        "format": "text",
        "as": "summary"
      }
    }
  },
  "edges": [
    {
      "from": "ping-url",
      "to": "format-result"
    }
  ]
}
```

This flow:
1. Makes a GET request to httpbin.org and stores the JSON response as `result`
2. Runs an echo command that extracts the `origin` field from the JSON response
3. The edge ensures `ping-url` completes before `format-result` runs

## Conditional branching example

```json
{
  "id": "conditional-flow",
  "version": "1.0",
  "nodes": {
    "check-status": {
      "type": "http",
      "url": "https://api.example.com/health",
      "method": "GET",
      "output": { "format": "json", "as": "health" }
    },
    "handle-ok": {
      "type": "script",
      "command": "echo",
      "args": ["Service is healthy"],
      "output": { "format": "text", "as": "msg" }
    },
    "handle-error": {
      "type": "script",
      "command": "echo",
      "args": ["Service is down!"],
      "output": { "format": "text", "as": "msg" }
    }
  },
  "edges": [
    {
      "from": "check-status",
      "to": "handle-ok",
      "condition": { "field": "nodes.check-status.health.status", "op": "eq", "value": "ok" }
    },
    {
      "from": "check-status",
      "to": "handle-error",
      "condition": { "field": "nodes.check-status.health.status", "op": "ne", "value": "ok" }
    }
  ]
}
```

This flow runs one of two branches depending on the health check result. The branch whose condition is not met is skipped.
