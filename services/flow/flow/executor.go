package flow

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Executor runs a flow to completion.
type Executor struct {
	flow    *Flow
	ctx     *RunContext
	logger  Logger
	nodeRun NodeRunFunc
}

// Logger writes structured log messages.
type Logger interface {
	Info(msg string)
	Debug(msg string)
}

// NodeRunFunc is called by the executor to run a single node.
// It is injected from outside the flow package to avoid a circular dependency with nodes/.
type NodeRunFunc func(ctx context.Context, nodeID string, node Node, rc *RunContext) (outputData []byte, outputFormat string, err error)

// NewExecutor creates a new Executor for the given flow.
func NewExecutor(f *Flow, rc *RunContext, logger Logger, runFunc NodeRunFunc) *Executor {
	return &Executor{
		flow:    f,
		ctx:     rc,
		logger:  logger,
		nodeRun: runFunc,
	}
}

// TopologicalSort returns node IDs in valid execution order using Kahn's algorithm.
func TopologicalSort(f *Flow) ([]string, error) {
	// Build in-degree map and adjacency list
	inDegree := make(map[string]int)
	adj := make(map[string][]string)
	for id := range f.Nodes {
		inDegree[id] = 0
		adj[id] = nil
	}
	for _, edge := range f.Edges {
		adj[edge.From] = append(adj[edge.From], edge.To)
		inDegree[edge.To]++
	}

	// Seed the queue with nodes that have no incoming edges
	var queue []string
	for id, deg := range inDegree {
		if deg == 0 {
			queue = append(queue, id)
		}
	}

	var order []string
	for len(queue) > 0 {
		// Pop front
		node := queue[0]
		queue = queue[1:]
		order = append(order, node)

		for _, neighbor := range adj[node] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	if len(order) != len(f.Nodes) {
		return nil, fmt.Errorf("topological sort failed: graph has a cycle")
	}

	return order, nil
}

// Execute runs all nodes in topological order.
func (e *Executor) Execute(ctx context.Context) error {
	order, err := TopologicalSort(e.flow)
	if err != nil {
		return err
	}

	for _, nodeID := range order {
		node := e.flow.Nodes[nodeID]

		// Check if this node should be skipped based on edge conditions
		if e.shouldSkip(nodeID) {
			e.logger.Info(fmt.Sprintf("skipping node: %s (conditions not met)", nodeID))
			e.ctx.MarkSkipped(nodeID)
			continue
		}

		e.logger.Info(fmt.Sprintf("starting node: %s", nodeID))

		nodeStart := time.Now()
		data, format, err := e.nodeRun(ctx, nodeID, node, e.ctx)
		if err != nil {
			return fmt.Errorf("node %s failed: %w", nodeID, err)
		}

		elapsed := time.Since(nodeStart)
		e.logger.Info(fmt.Sprintf("node %s completed in %s", nodeID, formatDuration(elapsed)))

		// Log the raw output in debug mode
		if format == "binary" {
			e.logger.Debug(fmt.Sprintf("node %s output (%s, %d bytes)", nodeID, format, len(data)))
		} else {
			e.logger.Debug(fmt.Sprintf("node %s output (%s):\n%s", nodeID, format, string(data)))
		}

		// Store the output
		outputName := node.Output.As
		switch format {
		case "json":
			var parsed interface{}
			if err := json.Unmarshal(data, &parsed); err != nil {
				// Fall back to storing as text
				e.ctx.Store(nodeID, outputName, string(data))
			} else {
				// Store the parsed structure as a map
				e.ctx.Store(nodeID, outputName, parsed)
			}
		case "binary":
			e.ctx.Store(nodeID, outputName, data)
		default: // "text"
			e.ctx.Store(nodeID, outputName, strings.TrimRight(string(data), "\n"))
		}
	}

	return nil
}

// shouldSkip determines whether a node should be skipped.
// A node is skipped if it has incoming conditional edges and none of them evaluate to true.
func (e *Executor) shouldSkip(nodeID string) bool {
	// Collect all incoming edges for this node
	var incoming []Edge
	for _, edge := range e.flow.Edges {
		if edge.To == nodeID {
			incoming = append(incoming, edge)
		}
	}

	if len(incoming) == 0 {
		return false
	}

	// Check if any incoming edges have conditions
	hasConditions := false
	for _, edge := range incoming {
		if edge.Condition != nil {
			hasConditions = true
			break
		}
	}

	if !hasConditions {
		// Check if all upstream nodes that connect to us were skipped
		allSkipped := true
		for _, edge := range incoming {
			if !e.ctx.IsSkipped(edge.From) {
				allSkipped = false
				break
			}
		}
		return allSkipped
	}

	// If there are conditions, at least one must be satisfied
	for _, edge := range incoming {
		if edge.Condition == nil {
			// An unconditional edge from a non-skipped node means don't skip
			if !e.ctx.IsSkipped(edge.From) {
				return false
			}
			continue
		}

		if e.ctx.IsSkipped(edge.From) {
			continue
		}

		satisfied, err := EvalCondition(*edge.Condition, e.ctx)
		if err != nil {
			e.logger.Debug(fmt.Sprintf("condition eval error for edge %s->%s: %v", edge.From, edge.To, err))
			continue
		}
		if satisfied {
			return false
		}
	}

	return true
}

// EvalCondition evaluates a single edge condition against the run context.
func EvalCondition(cond Condition, rc *RunContext) (bool, error) {
	val, err := rc.LookupPath(cond.Field)
	if err != nil {
		return false, fmt.Errorf("resolving condition field %q: %w", cond.Field, err)
	}

	switch cond.Op {
	case "eq":
		return compareEq(val, cond.Value), nil
	case "ne":
		return !compareEq(val, cond.Value), nil
	case "gt":
		return compareNumeric(val, cond.Value, func(a, b float64) bool { return a > b })
	case "gte":
		return compareNumeric(val, cond.Value, func(a, b float64) bool { return a >= b })
	case "lt":
		return compareNumeric(val, cond.Value, func(a, b float64) bool { return a < b })
	case "lte":
		return compareNumeric(val, cond.Value, func(a, b float64) bool { return a <= b })
	case "contains":
		return compareContains(val, cond.Value)
	default:
		return false, fmt.Errorf("unknown operator %q", cond.Op)
	}
}

func compareEq(a, b interface{}) bool {
	return fmt.Sprintf("%v", a) == fmt.Sprintf("%v", b)
}

func compareNumeric(a, b interface{}, op func(float64, float64) bool) (bool, error) {
	af, err := toFloat64(a)
	if err != nil {
		return false, fmt.Errorf("left operand: %w", err)
	}
	bf, err := toFloat64(b)
	if err != nil {
		return false, fmt.Errorf("right operand: %w", err)
	}
	return op(af, bf), nil
}

func toFloat64(v interface{}) (float64, error) {
	switch val := v.(type) {
	case float64:
		return val, nil
	case float32:
		return float64(val), nil
	case int:
		return float64(val), nil
	case int64:
		return float64(val), nil
	case json.Number:
		return val.Float64()
	case string:
		var f float64
		_, err := fmt.Sscanf(val, "%f", &f)
		if err != nil {
			return 0, fmt.Errorf("cannot convert %q to number", val)
		}
		return f, nil
	default:
		return 0, fmt.Errorf("cannot convert %T to number", v)
	}
}

func compareContains(a, b interface{}) (bool, error) {
	aStr := fmt.Sprintf("%v", a)
	bStr := fmt.Sprintf("%v", b)
	return strings.Contains(aStr, bStr), nil
}

func formatDuration(d time.Duration) string {
	if d < time.Second {
		return fmt.Sprintf("%dms", d.Milliseconds())
	}
	return fmt.Sprintf("%.1fs", d.Seconds())
}
