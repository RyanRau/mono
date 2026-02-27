package flow

import (
	"flowrunner/template"
	"fmt"
	"os"
	"strings"
	"sync"
)

// RunContext holds all node outputs for the current flow run.
type RunContext struct {
	mu      sync.RWMutex
	outputs map[string]map[string]interface{} // nodeID -> outputName -> value
	env     map[string]string
	skipped map[string]bool
}

// NewRunContext creates a RunContext populated with the current environment variables.
func NewRunContext() *RunContext {
	env := make(map[string]string)
	for _, entry := range os.Environ() {
		parts := strings.SplitN(entry, "=", 2)
		if len(parts) == 2 {
			env[parts[0]] = parts[1]
		}
	}
	return &RunContext{
		outputs: make(map[string]map[string]interface{}),
		env:     env,
		skipped: make(map[string]bool),
	}
}

// Store saves a node's output value.
func (rc *RunContext) Store(nodeID string, outputName string, value interface{}) {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	if rc.outputs[nodeID] == nil {
		rc.outputs[nodeID] = make(map[string]interface{})
	}
	rc.outputs[nodeID][outputName] = value
}

// Get retrieves a node's output value.
func (rc *RunContext) Get(nodeID string, outputName string) (interface{}, bool) {
	rc.mu.RLock()
	defer rc.mu.RUnlock()
	nodeOutputs, ok := rc.outputs[nodeID]
	if !ok {
		return nil, false
	}
	val, ok := nodeOutputs[outputName]
	return val, ok
}

// GetNodeOutputs returns all outputs for a given node.
func (rc *RunContext) GetNodeOutputs(nodeID string) (map[string]interface{}, bool) {
	rc.mu.RLock()
	defer rc.mu.RUnlock()
	outputs, ok := rc.outputs[nodeID]
	return outputs, ok
}

// GetEnv returns an environment variable value.
func (rc *RunContext) GetEnv(name string) (string, bool) {
	rc.mu.RLock()
	defer rc.mu.RUnlock()
	val, ok := rc.env[name]
	return val, ok
}

// MarkSkipped marks a node as skipped due to unmet conditions.
func (rc *RunContext) MarkSkipped(nodeID string) {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	rc.skipped[nodeID] = true
}

// IsSkipped returns whether a node was skipped.
func (rc *RunContext) IsSkipped(nodeID string) bool {
	rc.mu.RLock()
	defer rc.mu.RUnlock()
	return rc.skipped[nodeID]
}

// Resolve resolves template placeholders in the given string using node outputs and env vars.
func (rc *RunContext) Resolve(tmpl string) (string, error) {
	return template.Resolve(tmpl, rc)
}

// LookupPath resolves a dot-separated path like "nodes.ping.result" or "env.HOME".
// This is used by the template engine.
func (rc *RunContext) LookupPath(path string) (interface{}, error) {
	parts := strings.SplitN(path, ".", 2)
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid path %q: need at least two segments", path)
	}

	switch parts[0] {
	case "nodes":
		return rc.lookupNodePath(parts[1])
	case "env":
		val, ok := rc.GetEnv(parts[1])
		if !ok {
			return nil, fmt.Errorf("environment variable %q not found", parts[1])
		}
		return val, nil
	default:
		return nil, fmt.Errorf("unknown path prefix %q (expected \"nodes\" or \"env\")", parts[0])
	}
}

// lookupNodePath resolves a path like "ping.result" or "ping.result.seconds".
func (rc *RunContext) lookupNodePath(path string) (interface{}, error) {
	// Split into nodeID.field[.subfields...]
	parts := strings.SplitN(path, ".", 2)
	if len(parts) < 2 {
		return nil, fmt.Errorf("node path %q: need at least nodeID.field", path)
	}

	nodeID := parts[0]
	rest := parts[1]

	outputs, ok := rc.GetNodeOutputs(nodeID)
	if !ok {
		return nil, fmt.Errorf("node %q has no outputs (not yet executed?)", nodeID)
	}

	// Split the remaining path to get the output name and optional subfields
	fieldParts := strings.SplitN(rest, ".", 2)
	outputName := fieldParts[0]

	val, ok := outputs[outputName]
	if !ok {
		return nil, fmt.Errorf("node %q has no output named %q", nodeID, outputName)
	}

	// If there are subfields, drill into the value (must be a map)
	if len(fieldParts) == 2 {
		return drillInto(val, fieldParts[1])
	}

	return val, nil
}

// drillInto navigates nested maps using a dot-separated path.
func drillInto(val interface{}, path string) (interface{}, error) {
	parts := strings.Split(path, ".")
	current := val
	for _, part := range parts {
		m, ok := current.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("cannot drill into non-map value at %q", part)
		}
		current, ok = m[part]
		if !ok {
			return nil, fmt.Errorf("key %q not found in map", part)
		}
	}
	return current, nil
}
