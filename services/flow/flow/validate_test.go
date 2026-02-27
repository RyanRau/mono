package flow

import (
	"strings"
	"testing"
)

func TestValidate_ValidScriptFlow(t *testing.T) {
	f := &Flow{
		ID:      "valid",
		Version: "1.0",
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
			"b": {Type: "script", Command: "cat", Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{{From: "a", To: "b"}},
	}
	if err := Validate(f); err != nil {
		t.Errorf("Validate() error = %v", err)
	}
}

func TestValidate_ValidHTTPFlow(t *testing.T) {
	f := &Flow{
		ID:      "valid-http",
		Version: "1.0",
		Nodes: map[string]Node{
			"req": {Type: "http", URL: "https://example.com", Method: "GET", Output: NodeOutput{Format: "json", As: "resp"}},
		},
		Edges: nil,
	}
	if err := Validate(f); err != nil {
		t.Errorf("Validate() error = %v", err)
	}
}

func TestValidate_EmptyOutputAs(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: ""}},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for empty output.as")
	}
	if !strings.Contains(err.Error(), "output.as must be non-empty") {
		t.Errorf("error = %v, want mention of output.as", err)
	}
}

func TestValidate_ScriptMissingCommand(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "", Output: NodeOutput{Format: "text", As: "out"}},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for missing command")
	}
	if !strings.Contains(err.Error(), "command is required") {
		t.Errorf("error = %v, want mention of command", err)
	}
}

func TestValidate_HTTPMissingURL(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "http", URL: "", Method: "GET", Output: NodeOutput{Format: "json", As: "out"}},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for missing url")
	}
	if !strings.Contains(err.Error(), "url is required") {
		t.Errorf("error = %v, want mention of url", err)
	}
}

func TestValidate_HTTPMissingMethod(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "http", URL: "https://example.com", Method: "", Output: NodeOutput{Format: "json", As: "out"}},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for missing method")
	}
	if !strings.Contains(err.Error(), "method is required") {
		t.Errorf("error = %v, want mention of method", err)
	}
}

func TestValidate_UnknownNodeType(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "unknown", Output: NodeOutput{Format: "text", As: "out"}},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for unknown type")
	}
	if !strings.Contains(err.Error(), "unknown type") {
		t.Errorf("error = %v, want mention of unknown type", err)
	}
}

func TestValidate_EdgeReferencesUnknownNode(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{{From: "a", To: "nonexistent"}},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for unknown edge target")
	}
	if !strings.Contains(err.Error(), "unknown node") {
		t.Errorf("error = %v, want mention of unknown node", err)
	}
}

func TestValidate_EdgeFromUnknownNode(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"b": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{{From: "ghost", To: "b"}},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for unknown edge source")
	}
	if !strings.Contains(err.Error(), "unknown node") {
		t.Errorf("error = %v, want mention of unknown node", err)
	}
}

func TestValidate_CycleDetection_DirectCycle(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
			"b": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{
			{From: "a", To: "b"},
			{From: "b", To: "a"},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for cycle")
	}
	if !strings.Contains(err.Error(), "cycle") {
		t.Errorf("error = %v, want mention of cycle", err)
	}
}

func TestValidate_CycleDetection_SelfLoop(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{
			{From: "a", To: "a"},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for self-loop")
	}
	if !strings.Contains(err.Error(), "cycle") {
		t.Errorf("error = %v, want mention of cycle", err)
	}
}

func TestValidate_CycleDetection_IndirectCycle(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
			"b": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
			"c": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{
			{From: "a", To: "b"},
			{From: "b", To: "c"},
			{From: "c", To: "a"},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for indirect cycle")
	}
	if !strings.Contains(err.Error(), "cycle") {
		t.Errorf("error = %v, want mention of cycle", err)
	}
}

func TestValidate_NoCycleInDiamond(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
			"b": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
			"c": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
			"d": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{
			{From: "a", To: "b"},
			{From: "a", To: "c"},
			{From: "b", To: "d"},
			{From: "c", To: "d"},
		},
	}
	if err := Validate(f); err != nil {
		t.Errorf("Validate() error = %v, diamond DAG should be valid", err)
	}
}

func TestValidate_ConditionMissingField(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
			"b": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{
			{From: "a", To: "b", Condition: &Condition{Field: "", Op: "eq", Value: "x"}},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for empty condition field")
	}
	if !strings.Contains(err.Error(), "condition.field") {
		t.Errorf("error = %v, want mention of condition.field", err)
	}
}

func TestValidate_ConditionMissingOp(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
			"b": {Type: "script", Command: "echo", Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{
			{From: "a", To: "b", Condition: &Condition{Field: "nodes.a.out", Op: "", Value: "x"}},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error for empty condition op")
	}
	if !strings.Contains(err.Error(), "condition.op") {
		t.Errorf("error = %v, want mention of condition.op", err)
	}
}

func TestValidate_MultipleErrors(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Type: "script", Command: "", Output: NodeOutput{Format: "text", As: ""}},
		},
	}
	err := Validate(f)
	if err == nil {
		t.Fatal("expected error")
	}
	// Should contain both output.as and command errors
	if !strings.Contains(err.Error(), "output.as") {
		t.Errorf("error missing output.as: %v", err)
	}
	if !strings.Contains(err.Error(), "command is required") {
		t.Errorf("error missing command: %v", err)
	}
}
