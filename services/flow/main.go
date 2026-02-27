package main

import (
	"context"
	"flag"
	"flowrunner/flow"
	"flowrunner/nodes"
	"fmt"
	"io"
	"os"
	"strings"
	"time"
)

func main() {
	flowPath := flag.String("flow", "/flow.json", "path to flow JSON file, or - for stdin")
	dryRun := flag.Bool("dry-run", false, "validate and print execution order without running")
	logLevel := flag.String("log", "info", "log level: info | debug")
	flag.Parse()

	logger := &stdLogger{level: *logLevel}

	// Read flow JSON
	var data []byte
	var err error
	if *flowPath == "-" {
		data, err = io.ReadAll(os.Stdin)
		if err != nil {
			fatal("reading flow from stdin: %v", err)
		}
	} else {
		data, err = os.ReadFile(*flowPath)
		if err != nil {
			fatal("reading flow file: %v", err)
		}
	}

	// Parse
	f, err := flow.Parse(data)
	if err != nil {
		fatal("parsing flow: %v", err)
	}

	// Validate
	if err := flow.Validate(f); err != nil {
		fatal("%v", err)
	}

	// Topological sort
	order, err := flow.TopologicalSort(f)
	if err != nil {
		fatal("%v", err)
	}

	if *dryRun {
		logger.Info("dry run — execution order:")
		for i, id := range order {
			logger.Info(fmt.Sprintf("  %d. %s", i+1, id))
		}
		os.Exit(0)
	}

	// Build run context
	rc := flow.NewRunContext()

	// Build the node runner function that the executor will call
	runFunc := func(ctx context.Context, nodeID string, node flow.Node, rc *flow.RunContext) ([]byte, string, error) {
		runner, err := nodes.RunnerFor(node)
		if err != nil {
			return nil, "", err
		}

		// Resolve input from upstream node if specified
		var input *nodes.Input
		if node.Input != nil {
			inputData, inputFormat, err := resolveInput(node, rc)
			if err != nil {
				return nil, "", fmt.Errorf("resolving input: %w", err)
			}
			if inputData != nil {
				input = &nodes.Input{
					Data:   inputData,
					Format: inputFormat,
				}
			}
		}

		output, err := runner.Run(ctx, node, input, rc)
		if err != nil {
			return nil, "", err
		}

		return output.Data, output.Format, nil
	}

	// Execute
	executor := flow.NewExecutor(f, rc, logger, runFunc)
	flowStart := time.Now()

	if err := executor.Execute(context.Background()); err != nil {
		fatal("%v", err)
	}

	logger.Info(fmt.Sprintf("flow completed in %s", formatDuration(time.Since(flowStart))))
	os.Exit(0)
}

// resolveInput pulls the correct upstream output from RunContext based on the node's Input spec.
func resolveInput(node flow.Node, rc *flow.RunContext) ([]byte, string, error) {
	inp := node.Input
	if inp == nil {
		return nil, "", nil
	}

	if inp.From != "" {
		val, ok := rc.Get(inp.From, inp.Field)
		if !ok {
			return nil, "", fmt.Errorf("upstream node %q has no output %q", inp.From, inp.Field)
		}

		switch v := val.(type) {
		case []byte:
			return v, "binary", nil
		case string:
			return []byte(v), "text", nil
		default:
			// Try to serialize as JSON
			data := []byte(fmt.Sprintf("%v", v))
			return data, "text", nil
		}
	}

	if len(inp.FromAny) > 0 {
		// Take the first available output from any of the listed upstream nodes
		for _, upstreamID := range inp.FromAny {
			if rc.IsSkipped(upstreamID) {
				continue
			}
			val, ok := rc.Get(upstreamID, inp.Field)
			if ok {
				switch v := val.(type) {
				case []byte:
					return v, "binary", nil
				case string:
					return []byte(v), "text", nil
				default:
					data := []byte(fmt.Sprintf("%v", v))
					return data, "text", nil
				}
			}
		}
		return nil, "", fmt.Errorf("none of the from_any upstream nodes [%s] have output %q",
			strings.Join(inp.FromAny, ", "), inp.Field)
	}

	return nil, "", nil
}

func formatDuration(d time.Duration) string {
	if d < time.Second {
		return fmt.Sprintf("%dms", d.Milliseconds())
	}
	return fmt.Sprintf("%.1fs", d.Seconds())
}

func fatal(format string, args ...interface{}) {
	fmt.Fprintf(os.Stderr, "[flowrunner] error: "+format+"\n", args...)
	os.Exit(1)
}

// stdLogger writes log messages to stderr.
type stdLogger struct {
	level string
}

func (l *stdLogger) Info(msg string) {
	fmt.Fprintf(os.Stderr, "[flowrunner] %s\n", msg)
}

func (l *stdLogger) Debug(msg string) {
	if l.level == "debug" {
		fmt.Fprintf(os.Stderr, "[flowrunner] DEBUG: %s\n", msg)
	}
}
