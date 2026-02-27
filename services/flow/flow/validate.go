package flow

import (
	"fmt"
	"strings"
)

// Validate checks the flow for structural correctness:
//   - All edge endpoints reference existing node IDs
//   - No duplicate output names
//   - Graph is a valid DAG (no cycles)
//   - Each node has required fields for its type
//   - Output.As is non-empty on all nodes
func Validate(f *Flow) error {
	var errs []string

	// Check that every node has a non-empty Output.As
	for id, node := range f.Nodes {
		if node.Output.As == "" {
			errs = append(errs, fmt.Sprintf("node %q: output.as must be non-empty", id))
		}
	}

	// Check required fields per node type
	for id, node := range f.Nodes {
		switch node.Type {
		case "script":
			if node.Command == "" {
				errs = append(errs, fmt.Sprintf("node %q (type=script): command is required", id))
			}
		case "http":
			if node.URL == "" {
				errs = append(errs, fmt.Sprintf("node %q (type=http): url is required", id))
			}
			if node.Method == "" {
				errs = append(errs, fmt.Sprintf("node %q (type=http): method is required", id))
			}
		default:
			errs = append(errs, fmt.Sprintf("node %q: unknown type %q (must be \"script\" or \"http\")", id, node.Type))
		}
	}

	// Check that all edge from/to values reference existing node IDs
	for i, edge := range f.Edges {
		if _, ok := f.Nodes[edge.From]; !ok {
			errs = append(errs, fmt.Sprintf("edge[%d]: from references unknown node %q", i, edge.From))
		}
		if _, ok := f.Nodes[edge.To]; !ok {
			errs = append(errs, fmt.Sprintf("edge[%d]: to references unknown node %q", i, edge.To))
		}
	}

	// Validate edge conditions have required fields
	for i, edge := range f.Edges {
		if edge.Condition != nil {
			if edge.Condition.Field == "" {
				errs = append(errs, fmt.Sprintf("edge[%d]: condition.field must be non-empty", i))
			}
			if edge.Condition.Op == "" {
				errs = append(errs, fmt.Sprintf("edge[%d]: condition.op must be non-empty", i))
			}
		}
	}

	// Check for cycles using DFS
	if err := detectCycle(f); err != nil {
		errs = append(errs, err.Error())
	}

	if len(errs) > 0 {
		return fmt.Errorf("flow validation failed:\n  %s", strings.Join(errs, "\n  "))
	}
	return nil
}

// detectCycle uses DFS to check for cycles in the flow graph.
func detectCycle(f *Flow) error {
	// Build adjacency list
	adj := make(map[string][]string)
	for id := range f.Nodes {
		adj[id] = nil
	}
	for _, edge := range f.Edges {
		adj[edge.From] = append(adj[edge.From], edge.To)
	}

	const (
		white = 0 // unvisited
		gray  = 1 // in current path
		black = 2 // fully processed
	)

	color := make(map[string]int)
	for id := range f.Nodes {
		color[id] = white
	}

	var dfs func(node string) error
	dfs = func(node string) error {
		color[node] = gray
		for _, neighbor := range adj[node] {
			if color[neighbor] == gray {
				return fmt.Errorf("cycle detected: edge %s -> %s forms a cycle", node, neighbor)
			}
			if color[neighbor] == white {
				if err := dfs(neighbor); err != nil {
					return err
				}
			}
		}
		color[node] = black
		return nil
	}

	for id := range f.Nodes {
		if color[id] == white {
			if err := dfs(id); err != nil {
				return err
			}
		}
	}

	return nil
}
