package flow

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"
)

// nopLogger discards all log output.
type nopLogger struct{}

func (n *nopLogger) Info(msg string)  {}
func (n *nopLogger) Debug(msg string) {}

func TestTopologicalSort_Linear(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {}, "b": {}, "c": {},
		},
		Edges: []Edge{
			{From: "a", To: "b"},
			{From: "b", To: "c"},
		},
	}
	order, err := TopologicalSort(f)
	if err != nil {
		t.Fatalf("TopologicalSort error = %v", err)
	}
	if len(order) != 3 {
		t.Fatalf("len(order) = %d, want 3", len(order))
	}
	// a must come before b, b before c
	idx := indexMap(order)
	if idx["a"] >= idx["b"] {
		t.Errorf("a should come before b: %v", order)
	}
	if idx["b"] >= idx["c"] {
		t.Errorf("b should come before c: %v", order)
	}
}

func TestTopologicalSort_Diamond(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {}, "b": {}, "c": {}, "d": {},
		},
		Edges: []Edge{
			{From: "a", To: "b"},
			{From: "a", To: "c"},
			{From: "b", To: "d"},
			{From: "c", To: "d"},
		},
	}
	order, err := TopologicalSort(f)
	if err != nil {
		t.Fatalf("TopologicalSort error = %v", err)
	}
	idx := indexMap(order)
	if idx["a"] >= idx["b"] || idx["a"] >= idx["c"] {
		t.Errorf("a should come first: %v", order)
	}
	if idx["b"] >= idx["d"] || idx["c"] >= idx["d"] {
		t.Errorf("d should come last: %v", order)
	}
}

func TestTopologicalSort_SingleNode(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{"only": {}},
		Edges: nil,
	}
	order, err := TopologicalSort(f)
	if err != nil {
		t.Fatalf("TopologicalSort error = %v", err)
	}
	if len(order) != 1 || order[0] != "only" {
		t.Errorf("order = %v, want [only]", order)
	}
}

func TestTopologicalSort_DisconnectedNodes(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {}, "b": {}, "c": {},
		},
		Edges: nil,
	}
	order, err := TopologicalSort(f)
	if err != nil {
		t.Fatalf("TopologicalSort error = %v", err)
	}
	if len(order) != 3 {
		t.Errorf("len(order) = %d, want 3", len(order))
	}
}

func TestTopologicalSort_Cycle(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{"a": {}, "b": {}},
		Edges: []Edge{
			{From: "a", To: "b"},
			{From: "b", To: "a"},
		},
	}
	_, err := TopologicalSort(f)
	if err == nil {
		t.Fatal("expected error for cycle")
	}
}

func TestEvalCondition_Eq(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "out", "hello")

	ok, err := EvalCondition(Condition{Field: "nodes.n.out", Op: "eq", Value: "hello"}, rc)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Error("expected true for eq")
	}

	ok, err = EvalCondition(Condition{Field: "nodes.n.out", Op: "eq", Value: "world"}, rc)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Error("expected false for non-matching eq")
	}
}

func TestEvalCondition_Ne(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "out", "hello")

	ok, err := EvalCondition(Condition{Field: "nodes.n.out", Op: "ne", Value: "world"}, rc)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Error("expected true for ne")
	}
}

func TestEvalCondition_NumericComparisons(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "count", float64(42))

	tests := []struct {
		op    string
		value interface{}
		want  bool
	}{
		{"gt", float64(40), true},
		{"gt", float64(42), false},
		{"gte", float64(42), true},
		{"gte", float64(43), false},
		{"lt", float64(50), true},
		{"lt", float64(42), false},
		{"lte", float64(42), true},
		{"lte", float64(41), false},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("%s_%v", tt.op, tt.value), func(t *testing.T) {
			got, err := EvalCondition(Condition{Field: "nodes.n.count", Op: tt.op, Value: tt.value}, rc)
			if err != nil {
				t.Fatal(err)
			}
			if got != tt.want {
				t.Errorf("op=%s value=%v: got %v, want %v", tt.op, tt.value, got, tt.want)
			}
		})
	}
}

func TestEvalCondition_Contains(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "msg", "hello world")

	ok, err := EvalCondition(Condition{Field: "nodes.n.msg", Op: "contains", Value: "world"}, rc)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Error("expected true for contains")
	}

	ok, err = EvalCondition(Condition{Field: "nodes.n.msg", Op: "contains", Value: "xyz"}, rc)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Error("expected false for non-matching contains")
	}
}

func TestEvalCondition_UnknownOp(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "out", "x")

	_, err := EvalCondition(Condition{Field: "nodes.n.out", Op: "bogus", Value: "x"}, rc)
	if err == nil {
		t.Fatal("expected error for unknown op")
	}
}

func TestEvalCondition_BadNumericConversion(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "out", "not-a-number")

	_, err := EvalCondition(Condition{Field: "nodes.n.out", Op: "gt", Value: float64(10)}, rc)
	if err == nil {
		t.Fatal("expected error for non-numeric comparison")
	}
}

func TestEvalCondition_StringNumericConversion(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "out", "42.5")

	ok, err := EvalCondition(Condition{Field: "nodes.n.out", Op: "gt", Value: float64(40)}, rc)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Error("expected true: string '42.5' > 40")
	}
}

func TestEvalCondition_NestedField(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("api", "result", map[string]interface{}{
		"status": float64(200),
	})

	ok, err := EvalCondition(Condition{Field: "nodes.api.result.status", Op: "eq", Value: float64(200)}, rc)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Error("expected true for nested eq")
	}
}

func TestExecute_LinearFlow(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Output: NodeOutput{Format: "text", As: "out"}},
			"b": {Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{{From: "a", To: "b"}},
	}

	rc := newTestContext(nil)
	ran := make(map[string]bool)

	runFunc := func(ctx context.Context, nodeID string, node Node, rc *RunContext) ([]byte, string, error) {
		ran[nodeID] = true
		return []byte("ok"), "text", nil
	}

	executor := NewExecutor(f, rc, &nopLogger{}, runFunc)
	if err := executor.Execute(context.Background()); err != nil {
		t.Fatalf("Execute error = %v", err)
	}

	if !ran["a"] || !ran["b"] {
		t.Errorf("not all nodes ran: %v", ran)
	}

	// Check outputs were stored
	val, ok := rc.Get("a", "out")
	if !ok || val != "ok" {
		t.Errorf("node a output = %v", val)
	}
}

func TestExecute_JSONOutputParsed(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"api": {Output: NodeOutput{Format: "json", As: "result"}},
		},
	}

	rc := newTestContext(nil)
	runFunc := func(ctx context.Context, nodeID string, node Node, rc *RunContext) ([]byte, string, error) {
		return []byte(`{"status":"ok","code":200}`), "json", nil
	}

	executor := NewExecutor(f, rc, &nopLogger{}, runFunc)
	if err := executor.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}

	val, ok := rc.Get("api", "result")
	if !ok {
		t.Fatal("no output stored")
	}
	m, ok := val.(map[string]interface{})
	if !ok {
		t.Fatalf("expected map, got %T", val)
	}
	if m["status"] != "ok" {
		t.Errorf("status = %v", m["status"])
	}
}

func TestExecute_BinaryOutputStored(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"bin": {Output: NodeOutput{Format: "binary", As: "data"}},
		},
	}

	rc := newTestContext(nil)
	rawData := []byte{0x00, 0xFF, 0x42}
	runFunc := func(ctx context.Context, nodeID string, node Node, rc *RunContext) ([]byte, string, error) {
		return rawData, "binary", nil
	}

	executor := NewExecutor(f, rc, &nopLogger{}, runFunc)
	if err := executor.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}

	val, ok := rc.Get("bin", "data")
	if !ok {
		t.Fatal("no output stored")
	}
	b, ok := val.([]byte)
	if !ok {
		t.Fatalf("expected []byte, got %T", val)
	}
	if len(b) != 3 {
		t.Errorf("len = %d, want 3", len(b))
	}
}

func TestExecute_NodeFailure(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"fail": {Output: NodeOutput{Format: "text", As: "out"}},
		},
	}

	rc := newTestContext(nil)
	runFunc := func(ctx context.Context, nodeID string, node Node, rc *RunContext) ([]byte, string, error) {
		return nil, "", fmt.Errorf("boom")
	}

	executor := NewExecutor(f, rc, &nopLogger{}, runFunc)
	err := executor.Execute(context.Background())
	if err == nil {
		t.Fatal("expected error")
	}
	if !errContains(err, "boom") {
		t.Errorf("error = %v, want mention of boom", err)
	}
}

func TestExecute_TextOutputTrimmed(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"echo": {Output: NodeOutput{Format: "text", As: "out"}},
		},
	}

	rc := newTestContext(nil)
	runFunc := func(ctx context.Context, nodeID string, node Node, rc *RunContext) ([]byte, string, error) {
		return []byte("hello\n"), "text", nil
	}

	executor := NewExecutor(f, rc, &nopLogger{}, runFunc)
	if err := executor.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}

	val, _ := rc.Get("echo", "out")
	if val != "hello" {
		t.Errorf("val = %q, want %q (trailing newline should be trimmed)", val, "hello")
	}
}

func TestExecute_ConditionalSkip(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"check": {Output: NodeOutput{Format: "text", As: "status"}},
			"alert": {Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{
			{From: "check", To: "alert", Condition: &Condition{
				Field: "nodes.check.status",
				Op:    "eq",
				Value: "bad",
			}},
		},
	}

	rc := newTestContext(nil)
	ran := make(map[string]bool)
	runFunc := func(ctx context.Context, nodeID string, node Node, rc *RunContext) ([]byte, string, error) {
		ran[nodeID] = true
		if nodeID == "check" {
			return []byte("good"), "text", nil
		}
		return []byte("alerted"), "text", nil
	}

	executor := NewExecutor(f, rc, &nopLogger{}, runFunc)
	if err := executor.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}

	if !ran["check"] {
		t.Error("check should have run")
	}
	if ran["alert"] {
		t.Error("alert should have been skipped (condition not met)")
	}
	if !rc.IsSkipped("alert") {
		t.Error("alert should be marked as skipped")
	}
}

func TestExecute_ConditionalRun(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"check": {Output: NodeOutput{Format: "text", As: "status"}},
			"alert": {Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{
			{From: "check", To: "alert", Condition: &Condition{
				Field: "nodes.check.status",
				Op:    "eq",
				Value: "bad",
			}},
		},
	}

	rc := newTestContext(nil)
	ran := make(map[string]bool)
	runFunc := func(ctx context.Context, nodeID string, node Node, rc *RunContext) ([]byte, string, error) {
		ran[nodeID] = true
		if nodeID == "check" {
			return []byte("bad"), "text", nil
		}
		return []byte("sent"), "text", nil
	}

	executor := NewExecutor(f, rc, &nopLogger{}, runFunc)
	if err := executor.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}

	if !ran["check"] || !ran["alert"] {
		t.Errorf("both should have run: %v", ran)
	}
}

func TestExecute_SkipPropagation(t *testing.T) {
	// a -> b (conditional, won't fire) -> c (unconditional from b)
	// c should be skipped because b was skipped and c only has edges from skipped nodes
	f := &Flow{
		Nodes: map[string]Node{
			"a": {Output: NodeOutput{Format: "text", As: "out"}},
			"b": {Output: NodeOutput{Format: "text", As: "out"}},
			"c": {Output: NodeOutput{Format: "text", As: "out"}},
		},
		Edges: []Edge{
			{From: "a", To: "b", Condition: &Condition{Field: "nodes.a.out", Op: "eq", Value: "fire"}},
			{From: "b", To: "c"},
		},
	}

	rc := newTestContext(nil)
	ran := make(map[string]bool)
	runFunc := func(ctx context.Context, nodeID string, node Node, rc *RunContext) ([]byte, string, error) {
		ran[nodeID] = true
		return []byte("done"), "text", nil
	}

	executor := NewExecutor(f, rc, &nopLogger{}, runFunc)
	if err := executor.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}

	if !ran["a"] {
		t.Error("a should have run")
	}
	if ran["b"] {
		t.Error("b should be skipped")
	}
	if ran["c"] {
		t.Error("c should be skipped (all upstream skipped)")
	}
}

func TestExecute_InvalidJSONFallsBackToText(t *testing.T) {
	f := &Flow{
		Nodes: map[string]Node{
			"n": {Output: NodeOutput{Format: "json", As: "result"}},
		},
	}

	rc := newTestContext(nil)
	runFunc := func(ctx context.Context, nodeID string, node Node, rc *RunContext) ([]byte, string, error) {
		return []byte("not-json"), "json", nil
	}

	executor := NewExecutor(f, rc, &nopLogger{}, runFunc)
	if err := executor.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}

	val, ok := rc.Get("n", "result")
	if !ok {
		t.Fatal("no output stored")
	}
	// Should be stored as text string since JSON parsing failed
	s, ok := val.(string)
	if !ok {
		t.Fatalf("expected string fallback, got %T", val)
	}
	if s != "not-json" {
		t.Errorf("val = %q", s)
	}
}

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		dur  time.Duration
		want string
	}{
		{50 * time.Millisecond, "50ms"},
		{999 * time.Millisecond, "999ms"},
		{1500 * time.Millisecond, "1.5s"},
		{10 * time.Second, "10.0s"},
	}
	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			got := formatDuration(tt.dur)
			if got != tt.want {
				t.Errorf("formatDuration(%v) = %q, want %q", tt.dur, got, tt.want)
			}
		})
	}
}

// helpers

func indexMap(order []string) map[string]int {
	m := make(map[string]int)
	for i, id := range order {
		m[id] = i
	}
	return m
}

func errContains(err error, sub string) bool {
	return err != nil && strings.Contains(err.Error(), sub)
}
