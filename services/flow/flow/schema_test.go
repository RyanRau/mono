package flow

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParse_ValidFlow(t *testing.T) {
	data := []byte(`{
		"id": "test-flow",
		"version": "1.0",
		"nodes": {
			"step1": {
				"type": "script",
				"command": "echo",
				"args": ["hello"],
				"output": {"format": "text", "as": "result"}
			}
		},
		"edges": []
	}`)

	f, err := Parse(data)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if f.ID != "test-flow" {
		t.Errorf("ID = %q, want %q", f.ID, "test-flow")
	}
	if f.Version != "1.0" {
		t.Errorf("Version = %q, want %q", f.Version, "1.0")
	}
	if len(f.Nodes) != 1 {
		t.Errorf("len(Nodes) = %d, want 1", len(f.Nodes))
	}
	node := f.Nodes["step1"]
	if node.Type != "script" {
		t.Errorf("node type = %q, want %q", node.Type, "script")
	}
	if node.Command != "echo" {
		t.Errorf("node command = %q, want %q", node.Command, "echo")
	}
	if len(node.Args) != 1 || node.Args[0] != "hello" {
		t.Errorf("node args = %v, want [hello]", node.Args)
	}
	if node.Output.Format != "text" {
		t.Errorf("output format = %q, want %q", node.Output.Format, "text")
	}
	if node.Output.As != "result" {
		t.Errorf("output as = %q, want %q", node.Output.As, "result")
	}
}

func TestParse_HTTPNode(t *testing.T) {
	data := []byte(`{
		"id": "http-flow",
		"version": "1.0",
		"nodes": {
			"req": {
				"type": "http",
				"url": "https://example.com",
				"method": "POST",
				"headers": {"Content-Type": "application/json"},
				"body": {"key": "value"},
				"timeout_seconds": 10,
				"output": {"format": "json", "as": "resp"}
			}
		},
		"edges": []
	}`)

	f, err := Parse(data)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	node := f.Nodes["req"]
	if node.Type != "http" {
		t.Errorf("type = %q, want %q", node.Type, "http")
	}
	if node.URL != "https://example.com" {
		t.Errorf("url = %q, want %q", node.URL, "https://example.com")
	}
	if node.Method != "POST" {
		t.Errorf("method = %q, want %q", node.Method, "POST")
	}
	if node.Headers["Content-Type"] != "application/json" {
		t.Errorf("headers = %v", node.Headers)
	}
	if node.TimeoutSeconds != 10 {
		t.Errorf("timeout_seconds = %d, want 10", node.TimeoutSeconds)
	}
	bodyMap, ok := node.Body.(map[string]interface{})
	if !ok {
		t.Fatalf("body is not a map, got %T", node.Body)
	}
	if bodyMap["key"] != "value" {
		t.Errorf("body[key] = %v, want %q", bodyMap["key"], "value")
	}
}

func TestParse_EdgesWithCondition(t *testing.T) {
	data := []byte(`{
		"id": "cond-flow",
		"version": "1.0",
		"nodes": {
			"a": {"type": "script", "command": "echo", "output": {"format": "text", "as": "out"}},
			"b": {"type": "script", "command": "echo", "output": {"format": "text", "as": "out"}}
		},
		"edges": [
			{
				"from": "a",
				"to": "b",
				"condition": {
					"field": "nodes.a.out",
					"op": "eq",
					"value": "ok"
				}
			}
		]
	}`)

	f, err := Parse(data)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if len(f.Edges) != 1 {
		t.Fatalf("len(Edges) = %d, want 1", len(f.Edges))
	}
	edge := f.Edges[0]
	if edge.From != "a" || edge.To != "b" {
		t.Errorf("edge = %s->%s, want a->b", edge.From, edge.To)
	}
	if edge.Condition == nil {
		t.Fatal("condition is nil")
	}
	if edge.Condition.Op != "eq" {
		t.Errorf("condition op = %q, want %q", edge.Condition.Op, "eq")
	}
}

func TestParse_NodeInput(t *testing.T) {
	data := []byte(`{
		"id": "input-flow",
		"version": "1.0",
		"nodes": {
			"a": {
				"type": "script",
				"command": "echo",
				"output": {"format": "text", "as": "out"}
			},
			"b": {
				"type": "script",
				"command": "cat",
				"input": {"from": "a", "field": "out", "via": "stdin_text"},
				"output": {"format": "text", "as": "out"}
			}
		},
		"edges": [{"from": "a", "to": "b"}]
	}`)

	f, err := Parse(data)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	nodeB := f.Nodes["b"]
	if nodeB.Input == nil {
		t.Fatal("node b input is nil")
	}
	if nodeB.Input.From != "a" {
		t.Errorf("input.from = %q, want %q", nodeB.Input.From, "a")
	}
	if nodeB.Input.Field != "out" {
		t.Errorf("input.field = %q, want %q", nodeB.Input.Field, "out")
	}
	if nodeB.Input.Via != "stdin_text" {
		t.Errorf("input.via = %q, want %q", nodeB.Input.Via, "stdin_text")
	}
}

func TestParse_InvalidJSON(t *testing.T) {
	_, err := Parse([]byte(`{invalid`))
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestLoadFromFile(t *testing.T) {
	content := []byte(`{"id":"file-test","version":"1","nodes":{},"edges":[]}`)
	dir := t.TempDir()
	path := filepath.Join(dir, "test.json")
	if err := os.WriteFile(path, content, 0644); err != nil {
		t.Fatal(err)
	}

	f, err := LoadFromFile(path)
	if err != nil {
		t.Fatalf("LoadFromFile() error = %v", err)
	}
	if f.ID != "file-test" {
		t.Errorf("ID = %q, want %q", f.ID, "file-test")
	}
}

func TestLoadFromFile_NotFound(t *testing.T) {
	_, err := LoadFromFile("/nonexistent/path.json")
	if err == nil {
		t.Fatal("expected error for nonexistent file")
	}
}
