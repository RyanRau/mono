import type { Node, Edge } from "@xyflow/react";

export type NodeType = "script" | "http";
export type OutputFormat = "text" | "json" | "binary";
export type InputVia = "stdin_text" | "stdin_binary" | "";
export type ConditionOp =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains";

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

export interface FlowOutput {
  format: OutputFormat;
  as: string;
}

export interface FlowInput {
  useFromAny: boolean;
  from: string;
  from_any: string; // comma-separated list for form editing
  field: string;
  via: InputVia;
}

export interface Condition {
  field: string;
  op: ConditionOp;
  value: string;
}

// Data attached to each ReactFlow node — must extend Record<string, unknown>
export interface FlowNodeData extends Record<string, unknown> {
  label: string; // becomes the node ID in the flow spec
  nodeType: NodeType;
  // script fields
  command: string;
  args: string; // newline-separated for editing, split on export
  // http fields
  url: string;
  method: string;
  headers: HeaderEntry[];
  body: string; // raw string; if valid JSON object, exported as object
  // common
  timeoutSeconds: string;
  hasInput: boolean;
  input: FlowInput;
  output: FlowOutput;
}

// Data attached to each ReactFlow edge — must extend Record<string, unknown>
export interface FlowEdgeData extends Record<string, unknown> {
  hasCondition: boolean;
  condition: Condition;
}

export interface FlowMeta {
  id: string;
  version: string;
}

// Typed ReactFlow node and edge
export type FlowNode = Node<FlowNodeData, "flowNode">;
export type FlowEdge = Edge<FlowEdgeData>;
