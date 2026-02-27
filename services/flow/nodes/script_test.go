package nodes

import (
	"context"
	"flowrunner/flow"
	"strings"
	"testing"
)

func TestScriptRunner_Echo(t *testing.T) {
	rc := flow.NewRunContext()
	node := flow.Node{
		Type:    "script",
		Command: "echo",
		Args:    []string{"hello world"},
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &ScriptRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	got := strings.TrimSpace(string(out.Data))
	if got != "hello world" {
		t.Errorf("output = %q, want %q", got, "hello world")
	}
	if out.Format != "text" {
		t.Errorf("format = %q, want %q", out.Format, "text")
	}
}

func TestScriptRunner_MultipleArgs(t *testing.T) {
	rc := flow.NewRunContext()
	node := flow.Node{
		Type:    "script",
		Command: "echo",
		Args:    []string{"-n", "no-newline"},
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &ScriptRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	if string(out.Data) != "no-newline" {
		t.Errorf("output = %q, want %q", string(out.Data), "no-newline")
	}
}

func TestScriptRunner_StdinInput(t *testing.T) {
	rc := flow.NewRunContext()
	node := flow.Node{
		Type:    "script",
		Command: "cat",
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	input := &Input{
		Data:   []byte("piped data"),
		Format: "text",
	}

	runner := &ScriptRunner{}
	out, err := runner.Run(context.Background(), node, input, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	if string(out.Data) != "piped data" {
		t.Errorf("output = %q, want %q", string(out.Data), "piped data")
	}
}

func TestScriptRunner_FailingCommand(t *testing.T) {
	rc := flow.NewRunContext()
	node := flow.Node{
		Type:    "script",
		Command: "false",
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &ScriptRunner{}
	_, err := runner.Run(context.Background(), node, nil, rc)
	if err == nil {
		t.Fatal("expected error for failing command")
	}
	if !strings.Contains(err.Error(), "command failed") {
		t.Errorf("error = %v, want mention of command failed", err)
	}
}

func TestScriptRunner_NonexistentCommand(t *testing.T) {
	rc := flow.NewRunContext()
	node := flow.Node{
		Type:    "script",
		Command: "this-command-does-not-exist-12345",
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &ScriptRunner{}
	_, err := runner.Run(context.Background(), node, nil, rc)
	if err == nil {
		t.Fatal("expected error for nonexistent command")
	}
}

func TestScriptRunner_ContextCancellation(t *testing.T) {
	rc := flow.NewRunContext()
	node := flow.Node{
		Type:    "script",
		Command: "sleep",
		Args:    []string{"60"},
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	runner := &ScriptRunner{}
	_, err := runner.Run(ctx, node, nil, rc)
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}

func TestScriptRunner_CustomTimeout(t *testing.T) {
	rc := flow.NewRunContext()
	node := flow.Node{
		Type:           "script",
		Command:        "sleep",
		Args:           []string{"60"},
		TimeoutSeconds: 1,
		Output:         flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &ScriptRunner{}
	_, err := runner.Run(context.Background(), node, nil, rc)
	if err == nil {
		t.Fatal("expected error for timeout")
	}
}

func TestScriptRunner_TemplateResolution(t *testing.T) {
	rc := flow.NewRunContext()
	rc.Store("prev", "msg", "from-template")

	node := flow.Node{
		Type:    "script",
		Command: "echo",
		Args:    []string{"{{nodes.prev.msg}}"},
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &ScriptRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	got := strings.TrimSpace(string(out.Data))
	if got != "from-template" {
		t.Errorf("output = %q, want %q", got, "from-template")
	}
}

func TestScriptRunner_EmptyInput(t *testing.T) {
	rc := flow.NewRunContext()
	node := flow.Node{
		Type:    "script",
		Command: "echo",
		Args:    []string{"test"},
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	// Empty input should not affect the command
	input := &Input{Data: nil, Format: "text"}
	runner := &ScriptRunner{}
	out, err := runner.Run(context.Background(), node, input, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	got := strings.TrimSpace(string(out.Data))
	if got != "test" {
		t.Errorf("output = %q, want %q", got, "test")
	}
}

func TestScriptRunner_JSONOutput(t *testing.T) {
	rc := flow.NewRunContext()
	node := flow.Node{
		Type:    "script",
		Command: "echo",
		Args:    []string{`{"key":"value"}`},
		Output:  flow.NodeOutput{Format: "json", As: "result"},
	}

	runner := &ScriptRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	if out.Format != "json" {
		t.Errorf("format = %q, want %q", out.Format, "json")
	}
	if !strings.Contains(string(out.Data), `"key"`) {
		t.Errorf("output = %q, expected JSON", string(out.Data))
	}
}
