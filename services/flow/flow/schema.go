package flow

import (
	"encoding/json"
	"fmt"
	"os"
)

type Flow struct {
	ID      string          `json:"id"`
	Version string          `json:"version"`
	Nodes   map[string]Node `json:"nodes"`
	Edges   []Edge          `json:"edges"`
}

type Node struct {
	Type           string            `json:"type"`            // "script" | "http"
	Command        string            `json:"command"`         // script only
	Args           []string          `json:"args"`            // script only
	URL            string            `json:"url"`             // http only
	Method         string            `json:"method"`          // http only
	Headers        map[string]string `json:"headers"`         // http only
	Body           interface{}       `json:"body"`            // http only — map or raw string
	TimeoutSeconds int               `json:"timeout_seconds"` // optional override
	Input          *NodeInput        `json:"input"`
	Output         NodeOutput        `json:"output"`
}

type NodeInput struct {
	From    string   `json:"from"`     // single upstream node ID
	Field   string   `json:"field"`    // which output field to take
	Via     string   `json:"via"`      // "stdin_text" | "stdin_binary"
	FromAny []string `json:"from_any"` // merge: fire when any completes
}

type NodeOutput struct {
	Format string `json:"format"` // "text" | "json" | "binary"
	As     string `json:"as"`     // name to store result under
}

type Edge struct {
	From      string     `json:"from"`
	To        string     `json:"to"`
	Condition *Condition `json:"condition"`
}

type Condition struct {
	Field string      `json:"field"` // e.g. "nodes.check-dur.result.seconds"
	Op    string      `json:"op"`    // "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains"
	Value interface{} `json:"value"`
}

// LoadFromFile reads and unmarshals a flow JSON file.
func LoadFromFile(path string) (*Flow, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading flow file: %w", err)
	}
	return Parse(data)
}

// Parse unmarshals flow JSON bytes into a Flow struct.
func Parse(data []byte) (*Flow, error) {
	var f Flow
	if err := json.Unmarshal(data, &f); err != nil {
		return nil, fmt.Errorf("parsing flow JSON: %w", err)
	}
	return &f, nil
}
