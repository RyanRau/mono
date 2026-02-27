package template

import (
	"fmt"
	"strings"
	"testing"
)

// mockResolver implements PathResolver for testing.
type mockResolver struct {
	values map[string]interface{}
}

func (m *mockResolver) LookupPath(path string) (interface{}, error) {
	val, ok := m.values[path]
	if !ok {
		return nil, fmt.Errorf("path %q not found", path)
	}
	return val, nil
}

func TestResolve_NoPlaceholders(t *testing.T) {
	r := &mockResolver{}
	got, err := Resolve("plain text", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "plain text" {
		t.Errorf("got %q, want %q", got, "plain text")
	}
}

func TestResolve_SinglePlaceholder(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{
		"nodes.step1.out": "hello",
	}}
	got, err := Resolve("{{nodes.step1.out}}", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "hello" {
		t.Errorf("got %q, want %q", got, "hello")
	}
}

func TestResolve_MultiplePlaceholders(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{
		"nodes.a.out": "hello",
		"env.USER":    "alice",
	}}
	got, err := Resolve("{{nodes.a.out}} from {{env.USER}}", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "hello from alice" {
		t.Errorf("got %q, want %q", got, "hello from alice")
	}
}

func TestResolve_PlaceholderWithSpaces(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{
		"nodes.x.out": "val",
	}}
	got, err := Resolve("{{ nodes.x.out }}", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "val" {
		t.Errorf("got %q, want %q", got, "val")
	}
}

func TestResolve_TextAroundPlaceholder(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{
		"env.NAME": "world",
	}}
	got, err := Resolve("Hello, {{env.NAME}}!", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "Hello, world!" {
		t.Errorf("got %q, want %q", got, "Hello, world!")
	}
}

func TestResolve_Float64WholeNumber(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{
		"nodes.n.count": float64(42),
	}}
	got, err := Resolve("count: {{nodes.n.count}}", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "count: 42" {
		t.Errorf("got %q, want %q", got, "count: 42")
	}
}

func TestResolve_Float64Decimal(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{
		"nodes.n.val": float64(3.14),
	}}
	got, err := Resolve("pi: {{nodes.n.val}}", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "pi: 3.14" {
		t.Errorf("got %q, want %q", got, "pi: 3.14")
	}
}

func TestResolve_BinaryData(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{
		"nodes.n.data": []byte{0x00, 0xFF},
	}}
	got, err := Resolve("result: {{nodes.n.data}}", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "result: [binary data]" {
		t.Errorf("got %q, want %q", got, "result: [binary data]")
	}
}

func TestResolve_UnclosedBrace(t *testing.T) {
	r := &mockResolver{}
	got, err := Resolve("open {{ but no close", r)
	if err != nil {
		t.Fatal(err)
	}
	// Should pass through as-is
	if got != "open {{ but no close" {
		t.Errorf("got %q, want %q", got, "open {{ but no close")
	}
}

func TestResolve_ErrorOnMissingPath(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{}}
	_, err := Resolve("{{nodes.missing.out}}", r)
	if err == nil {
		t.Fatal("expected error for missing path")
	}
	if !strings.Contains(err.Error(), "missing") {
		t.Errorf("error = %v", err)
	}
}

func TestResolve_EmptyString(t *testing.T) {
	r := &mockResolver{}
	got, err := Resolve("", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "" {
		t.Errorf("got %q, want empty", got)
	}
}

func TestResolve_AdjacentPlaceholders(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{
		"nodes.a.x": "hello",
		"nodes.b.y": "world",
	}}
	got, err := Resolve("{{nodes.a.x}}{{nodes.b.y}}", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "helloworld" {
		t.Errorf("got %q, want %q", got, "helloworld")
	}
}

func TestResolve_DefaultFormattingForOtherTypes(t *testing.T) {
	r := &mockResolver{values: map[string]interface{}{
		"nodes.n.val": true,
	}}
	got, err := Resolve("{{nodes.n.val}}", r)
	if err != nil {
		t.Fatal(err)
	}
	if got != "true" {
		t.Errorf("got %q, want %q", got, "true")
	}
}
