package flow

import (
	"testing"
)

// newTestContext creates a RunContext with custom env vars (no OS env pollution).
func newTestContext(env map[string]string) *RunContext {
	if env == nil {
		env = make(map[string]string)
	}
	return &RunContext{
		outputs: make(map[string]map[string]interface{}),
		env:     env,
		skipped: make(map[string]bool),
	}
}

func TestRunContext_StoreAndGet(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("node1", "result", "hello")

	val, ok := rc.Get("node1", "result")
	if !ok {
		t.Fatal("Get returned false")
	}
	if val != "hello" {
		t.Errorf("Get = %v, want %q", val, "hello")
	}
}

func TestRunContext_GetMissing(t *testing.T) {
	rc := newTestContext(nil)

	_, ok := rc.Get("nonexistent", "result")
	if ok {
		t.Error("Get should return false for nonexistent node")
	}

	rc.Store("node1", "result", "data")
	_, ok = rc.Get("node1", "other")
	if ok {
		t.Error("Get should return false for nonexistent output name")
	}
}

func TestRunContext_StoreOverwrite(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "out", "first")
	rc.Store("n", "out", "second")

	val, _ := rc.Get("n", "out")
	if val != "second" {
		t.Errorf("Get = %v, want %q", val, "second")
	}
}

func TestRunContext_MultipleOutputs(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "stdout", "text output")
	rc.Store("n", "status", float64(200))

	v1, _ := rc.Get("n", "stdout")
	if v1 != "text output" {
		t.Errorf("stdout = %v", v1)
	}
	v2, _ := rc.Get("n", "status")
	if v2 != float64(200) {
		t.Errorf("status = %v", v2)
	}
}

func TestRunContext_GetNodeOutputs(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "a", "1")
	rc.Store("n", "b", "2")

	outputs, ok := rc.GetNodeOutputs("n")
	if !ok {
		t.Fatal("GetNodeOutputs returned false")
	}
	if len(outputs) != 2 {
		t.Errorf("len(outputs) = %d, want 2", len(outputs))
	}
}

func TestRunContext_GetNodeOutputs_Missing(t *testing.T) {
	rc := newTestContext(nil)
	_, ok := rc.GetNodeOutputs("nope")
	if ok {
		t.Error("expected false for missing node")
	}
}

func TestRunContext_Env(t *testing.T) {
	rc := newTestContext(map[string]string{"MY_VAR": "my_val"})

	val, ok := rc.GetEnv("MY_VAR")
	if !ok {
		t.Fatal("GetEnv returned false")
	}
	if val != "my_val" {
		t.Errorf("GetEnv = %q, want %q", val, "my_val")
	}

	_, ok = rc.GetEnv("MISSING")
	if ok {
		t.Error("GetEnv should return false for missing var")
	}
}

func TestRunContext_SkipTracking(t *testing.T) {
	rc := newTestContext(nil)

	if rc.IsSkipped("a") {
		t.Error("node should not be skipped initially")
	}

	rc.MarkSkipped("a")
	if !rc.IsSkipped("a") {
		t.Error("node should be skipped after MarkSkipped")
	}
	if rc.IsSkipped("b") {
		t.Error("other node should not be skipped")
	}
}

func TestRunContext_LookupPath_Env(t *testing.T) {
	rc := newTestContext(map[string]string{"HOME": "/home/test"})

	val, err := rc.LookupPath("env.HOME")
	if err != nil {
		t.Fatalf("LookupPath error = %v", err)
	}
	if val != "/home/test" {
		t.Errorf("val = %v, want %q", val, "/home/test")
	}
}

func TestRunContext_LookupPath_EnvMissing(t *testing.T) {
	rc := newTestContext(nil)
	_, err := rc.LookupPath("env.DOES_NOT_EXIST")
	if err == nil {
		t.Fatal("expected error for missing env var")
	}
}

func TestRunContext_LookupPath_NodeOutput(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("ping", "result", "pong")

	val, err := rc.LookupPath("nodes.ping.result")
	if err != nil {
		t.Fatalf("LookupPath error = %v", err)
	}
	if val != "pong" {
		t.Errorf("val = %v, want %q", val, "pong")
	}
}

func TestRunContext_LookupPath_NestedJSON(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("api", "result", map[string]interface{}{
		"data": map[string]interface{}{
			"name": "test",
		},
	})

	val, err := rc.LookupPath("nodes.api.result.data.name")
	if err != nil {
		t.Fatalf("LookupPath error = %v", err)
	}
	if val != "test" {
		t.Errorf("val = %v, want %q", val, "test")
	}
}

func TestRunContext_LookupPath_MissingNode(t *testing.T) {
	rc := newTestContext(nil)
	_, err := rc.LookupPath("nodes.missing.result")
	if err == nil {
		t.Fatal("expected error for missing node")
	}
}

func TestRunContext_LookupPath_MissingField(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "result", "val")

	_, err := rc.LookupPath("nodes.n.missing")
	if err == nil {
		t.Fatal("expected error for missing field")
	}
}

func TestRunContext_LookupPath_DrillIntoNonMap(t *testing.T) {
	rc := newTestContext(nil)
	rc.Store("n", "result", "just a string")

	_, err := rc.LookupPath("nodes.n.result.subfield")
	if err == nil {
		t.Fatal("expected error when drilling into non-map")
	}
}

func TestRunContext_LookupPath_InvalidPrefix(t *testing.T) {
	rc := newTestContext(nil)
	_, err := rc.LookupPath("other.path")
	if err == nil {
		t.Fatal("expected error for invalid prefix")
	}
}

func TestRunContext_LookupPath_TooShort(t *testing.T) {
	rc := newTestContext(nil)
	_, err := rc.LookupPath("single")
	if err == nil {
		t.Fatal("expected error for single-segment path")
	}
}

func TestRunContext_LookupPath_NodePathTooShort(t *testing.T) {
	rc := newTestContext(nil)
	_, err := rc.LookupPath("nodes.justNodeID")
	if err == nil {
		t.Fatal("expected error for node path without field")
	}
}

func TestRunContext_Resolve(t *testing.T) {
	rc := newTestContext(map[string]string{"USER": "alice"})
	rc.Store("step1", "out", "hello")

	result, err := rc.Resolve("got {{nodes.step1.out}} from {{env.USER}}")
	if err != nil {
		t.Fatalf("Resolve error = %v", err)
	}
	if result != "got hello from alice" {
		t.Errorf("result = %q, want %q", result, "got hello from alice")
	}
}

func TestRunContext_StoreBinaryAndText(t *testing.T) {
	rc := newTestContext(nil)

	// Binary
	rc.Store("bin", "data", []byte{0x00, 0xFF, 0x42})
	val, _ := rc.Get("bin", "data")
	bdata, ok := val.([]byte)
	if !ok {
		t.Fatalf("expected []byte, got %T", val)
	}
	if len(bdata) != 3 {
		t.Errorf("binary len = %d, want 3", len(bdata))
	}

	// JSON-like map
	rc.Store("api", "resp", map[string]interface{}{"status": "ok"})
	val2, _ := rc.Get("api", "resp")
	m, ok := val2.(map[string]interface{})
	if !ok {
		t.Fatalf("expected map, got %T", val2)
	}
	if m["status"] != "ok" {
		t.Errorf("status = %v", m["status"])
	}
}
