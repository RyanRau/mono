package nodes

import (
	"context"
	"flowrunner/flow"
	"fmt"
)

// Input holds data to be passed into a node runner.
type Input struct {
	Data   []byte
	Format string // "text" | "binary" | "json"
}

// Output holds the result of a node execution.
type Output struct {
	Data   []byte
	Format string // "text" | "binary" | "json"
}

// Runner executes a single node.
type Runner interface {
	Run(ctx context.Context, node flow.Node, input *Input, rc *flow.RunContext) (*Output, error)
}

// RunnerFor returns the appropriate runner for a given node type.
func RunnerFor(node flow.Node) (Runner, error) {
	switch node.Type {
	case "script":
		return &ScriptRunner{}, nil
	case "http":
		return &HTTPRunner{}, nil
	default:
		return nil, fmt.Errorf("unknown node type: %q", node.Type)
	}
}
