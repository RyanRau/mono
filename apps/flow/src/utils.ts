import type { FlowNode, FlowEdge, FlowMeta, FlowNodeData } from "./types";

export function newNodeData(
  nodeType: "script" | "http",
  counter: number,
): FlowNodeData {
  const label =
    nodeType === "script" ? `script-${counter}` : `http-${counter}`;
  return {
    label,
    nodeType,
    command: nodeType === "script" ? "echo" : "",
    args: "",
    url: nodeType === "http" ? "https://example.com" : "",
    method: nodeType === "http" ? "GET" : "",
    headers: [],
    body: "",
    timeoutSeconds: "",
    hasInput: false,
    input: {
      useFromAny: false,
      from: "",
      from_any: "",
      field: "",
      via: "",
    },
    output: {
      format: nodeType === "http" ? "json" : "text",
      as: "result",
    },
  };
}

export function buildFlowJson(
  meta: FlowMeta,
  nodes: FlowNode[],
  edges: FlowEdge[],
): unknown {
  const idToLabel = new Map<string, string>();
  for (const node of nodes) {
    idToLabel.set(node.id, node.data.label || node.id);
  }

  const flowNodes: Record<string, unknown> = {};

  for (const node of nodes) {
    const d = node.data;
    const nodeId = d.label || node.id;

    const spec: Record<string, unknown> = {
      type: d.nodeType,
      output: {
        format: d.output.format,
        as: d.output.as,
      },
    };

    if (d.nodeType === "script") {
      if (d.command) spec.command = d.command;
      const args = d.args
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (args.length > 0) spec.args = args;
    } else {
      if (d.url) spec.url = d.url;
      if (d.method) spec.method = d.method;

      const headers: Record<string, string> = {};
      for (const h of d.headers) {
        if (h.key.trim()) headers[h.key.trim()] = h.value;
      }
      if (Object.keys(headers).length > 0) spec.headers = headers;

      if (d.body) {
        try {
          const parsed: unknown = JSON.parse(d.body);
          if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            spec.body = parsed;
          } else {
            spec.body = d.body;
          }
        } catch {
          spec.body = d.body;
        }
      }
    }

    if (d.timeoutSeconds) {
      const t = parseInt(d.timeoutSeconds, 10);
      if (!isNaN(t) && t > 0) spec.timeout_seconds = t;
    }

    if (d.hasInput && (d.input.from || d.input.from_any || d.input.field)) {
      const input: Record<string, unknown> = {
        field: d.input.field,
      };
      if (d.input.useFromAny) {
        const fromAny = d.input.from_any
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (fromAny.length > 0) input.from_any = fromAny;
      } else {
        if (d.input.from) input.from = d.input.from;
      }
      if (d.input.via) input.via = d.input.via;
      spec.input = input;
    }

    flowNodes[nodeId] = spec;
  }

  const flowEdges = edges.map((e) => {
    const edgeSpec: Record<string, unknown> = {
      from: idToLabel.get(e.source) ?? e.source,
      to: idToLabel.get(e.target) ?? e.target,
    };
    if (e.data?.hasCondition && e.data.condition.field) {
      const c = e.data.condition;
      const numVal = Number(c.value);
      edgeSpec.condition = {
        field: c.field,
        op: c.op,
        value: !isNaN(numVal) && c.value !== "" ? numVal : c.value,
      };
    }
    return edgeSpec;
  });

  const flow: Record<string, unknown> = {
    nodes: flowNodes,
    edges: flowEdges,
  };
  if (meta.id) flow.id = meta.id;
  if (meta.version) flow.version = meta.version;

  return flow;
}
