package nodes

import (
	"context"
	"encoding/json"
	"flowrunner/flow"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHTTPRunner_GET(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			t.Errorf("method = %q, want GET", r.Method)
		}
		w.WriteHeader(200)
		fmt.Fprint(w, "ok")
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "GET",
		Output: flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &HTTPRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	if string(out.Data) != "ok" {
		t.Errorf("output = %q, want %q", string(out.Data), "ok")
	}
	if out.Format != "text" {
		t.Errorf("format = %q, want %q", out.Format, "text")
	}
}

func TestHTTPRunner_POST_JSONBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("method = %q, want POST", r.Method)
		}
		ct := r.Header.Get("Content-Type")
		if ct != "application/json" {
			t.Errorf("Content-Type = %q, want application/json", ct)
		}
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("failed to decode body: %v", err)
		}
		if body["key"] != "value" {
			t.Errorf("body[key] = %v", body["key"])
		}
		w.WriteHeader(200)
		fmt.Fprint(w, `{"status":"ok"}`)
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "POST",
		Body:   map[string]interface{}{"key": "value"},
		Output: flow.NodeOutput{Format: "json", As: "result"},
	}

	runner := &HTTPRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	if out.Format != "json" {
		t.Errorf("format = %q, want %q", out.Format, "json")
	}
}

func TestHTTPRunner_POST_StringBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		fmt.Fprint(w, "received")
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "POST",
		Body:   "raw body content",
		Output: flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &HTTPRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	if string(out.Data) != "received" {
		t.Errorf("output = %q, want %q", string(out.Data), "received")
	}
}

func TestHTTPRunner_CustomHeaders(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Custom") != "test-value" {
			t.Errorf("X-Custom = %q", r.Header.Get("X-Custom"))
		}
		w.WriteHeader(200)
		fmt.Fprint(w, "ok")
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:    "http",
		URL:     srv.URL,
		Method:  "GET",
		Headers: map[string]string{"X-Custom": "test-value"},
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &HTTPRunner{}
	_, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
}

func TestHTTPRunner_Non2xxError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
		fmt.Fprint(w, "internal server error")
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "GET",
		Output: flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &HTTPRunner{}
	_, err := runner.Run(context.Background(), node, nil, rc)
	if err == nil {
		t.Fatal("expected error for 500")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Errorf("error = %v, want mention of 500", err)
	}
	if !strings.Contains(err.Error(), "internal server error") {
		t.Errorf("error = %v, want body included", err)
	}
}

func TestHTTPRunner_404Error(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(404)
		fmt.Fprint(w, "not found")
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "GET",
		Output: flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &HTTPRunner{}
	_, err := runner.Run(context.Background(), node, nil, rc)
	if err == nil {
		t.Fatal("expected error for 404")
	}
	if !strings.Contains(err.Error(), "404") {
		t.Errorf("error = %v, want mention of 404", err)
	}
}

func TestHTTPRunner_JSONOutputFallback(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		fmt.Fprint(w, "not json")
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "GET",
		Output: flow.NodeOutput{Format: "json", As: "result"},
	}

	runner := &HTTPRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	// Should fall back to text when response isn't valid JSON
	if out.Format != "text" {
		t.Errorf("format = %q, want %q (fallback to text)", out.Format, "text")
	}
}

func TestHTTPRunner_JSONOutputValid(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		fmt.Fprint(w, `{"data": [1, 2, 3]}`)
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "GET",
		Output: flow.NodeOutput{Format: "json", As: "result"},
	}

	runner := &HTTPRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	if out.Format != "json" {
		t.Errorf("format = %q, want %q", out.Format, "json")
	}
}

func TestHTTPRunner_TemplateInURL(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/hello" {
			t.Errorf("path = %q, want /hello", r.URL.Path)
		}
		w.WriteHeader(200)
		fmt.Fprint(w, "ok")
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	rc.Store("prev", "path", "hello")

	node := flow.Node{
		Type:   "http",
		URL:    srv.URL + "/{{nodes.prev.path}}",
		Method: "GET",
		Output: flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &HTTPRunner{}
	_, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
}

func TestHTTPRunner_TemplateInHeader(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret123" {
			t.Errorf("Authorization = %q", r.Header.Get("Authorization"))
		}
		w.WriteHeader(200)
		fmt.Fprint(w, "ok")
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	rc.Store("auth", "token", "secret123")

	node := flow.Node{
		Type:    "http",
		URL:     srv.URL,
		Method:  "GET",
		Headers: map[string]string{"Authorization": "Bearer {{nodes.auth.token}}"},
		Output:  flow.NodeOutput{Format: "text", As: "result"},
	}

	runner := &HTTPRunner{}
	_, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
}

func TestHTTPRunner_ContextCancellation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Slow response — should be cancelled before completing
		select {}
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "GET",
		Output: flow.NodeOutput{Format: "text", As: "result"},
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	runner := &HTTPRunner{}
	_, err := runner.Run(ctx, node, nil, rc)
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}

func TestHTTPRunner_DefaultFormatIsText(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		fmt.Fprint(w, "data")
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "GET",
		Output: flow.NodeOutput{Format: "", As: "result"}, // Empty format
	}

	runner := &HTTPRunner{}
	out, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
	if out.Format != "text" {
		t.Errorf("format = %q, want %q (default)", out.Format, "text")
	}
}

func TestHTTPRunner_MapBodyAutoSetsContentType(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ct := r.Header.Get("Content-Type")
		if ct != "application/json" {
			t.Errorf("Content-Type = %q, want application/json", ct)
		}
		w.WriteHeader(200)
	}))
	defer srv.Close()

	rc := flow.NewRunContext()
	node := flow.Node{
		Type:   "http",
		URL:    srv.URL,
		Method: "POST",
		Body:   map[string]interface{}{"a": "b"},
		Output: flow.NodeOutput{Format: "text", As: "result"},
		// No explicit headers — Content-Type should be auto-set
	}

	runner := &HTTPRunner{}
	_, err := runner.Run(context.Background(), node, nil, rc)
	if err != nil {
		t.Fatalf("Run error = %v", err)
	}
}
