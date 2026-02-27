package nodes

import (
	"bytes"
	"context"
	"encoding/json"
	"flowrunner/flow"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const defaultHTTPTimeout = 30 * time.Second

// HTTPRunner executes an HTTP request as specified in an http node.
type HTTPRunner struct{}

func (h *HTTPRunner) Run(ctx context.Context, node flow.Node, input *Input, rc *flow.RunContext) (*Output, error) {
	// Resolve URL
	url, err := rc.Resolve(node.URL)
	if err != nil {
		return nil, fmt.Errorf("resolving url: %w", err)
	}

	// Resolve method
	method := strings.ToUpper(node.Method)

	// Build request body
	var body io.Reader
	if node.Body != nil {
		switch b := node.Body.(type) {
		case map[string]interface{}:
			// Marshal map to JSON
			data, err := json.Marshal(b)
			if err != nil {
				return nil, fmt.Errorf("marshalling body to JSON: %w", err)
			}
			// Resolve templates in the JSON string
			resolved, err := rc.Resolve(string(data))
			if err != nil {
				return nil, fmt.Errorf("resolving body templates: %w", err)
			}
			body = strings.NewReader(resolved)
			if node.Headers == nil {
				node.Headers = make(map[string]string)
			}
			if _, ok := node.Headers["Content-Type"]; !ok {
				node.Headers["Content-Type"] = "application/json"
			}
		case string:
			resolved, err := rc.Resolve(b)
			if err != nil {
				return nil, fmt.Errorf("resolving body template: %w", err)
			}
			body = strings.NewReader(resolved)
		default:
			data, err := json.Marshal(b)
			if err != nil {
				return nil, fmt.Errorf("marshalling body: %w", err)
			}
			body = bytes.NewReader(data)
		}
	}

	// Determine timeout
	timeout := defaultHTTPTimeout
	if node.TimeoutSeconds > 0 {
		timeout = time.Duration(node.TimeoutSeconds) * time.Second
	}

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Create request
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	// Resolve and set headers
	for key, val := range node.Headers {
		resolvedVal, err := rc.Resolve(val)
		if err != nil {
			return nil, fmt.Errorf("resolving header %q: %w", key, err)
		}
		req.Header.Set(key, resolvedVal)
	}

	// Execute request
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response body: %w", err)
	}

	// Check status code
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	outputFormat := node.Output.Format
	if outputFormat == "" {
		outputFormat = "text"
	}

	// If JSON output requested, verify it parses
	if outputFormat == "json" {
		var check interface{}
		if err := json.Unmarshal(respBody, &check); err != nil {
			// Fall back to text if JSON parsing fails
			outputFormat = "text"
		}
	}

	return &Output{
		Data:   respBody,
		Format: outputFormat,
	}, nil
}
