package nodes

import (
	"bytes"
	"context"
	"flowrunner/flow"
	"fmt"
	"os/exec"
	"time"
)

const defaultScriptTimeout = 5 * time.Minute

// ScriptRunner executes a shell command as specified in a script node.
type ScriptRunner struct{}

func (s *ScriptRunner) Run(ctx context.Context, node flow.Node, input *Input, rc *flow.RunContext) (*Output, error) {
	// Resolve command through template engine
	command, err := rc.Resolve(node.Command)
	if err != nil {
		return nil, fmt.Errorf("resolving command: %w", err)
	}

	// Resolve args
	args := make([]string, len(node.Args))
	for i, arg := range node.Args {
		resolved, err := rc.Resolve(arg)
		if err != nil {
			return nil, fmt.Errorf("resolving arg[%d]: %w", i, err)
		}
		args[i] = resolved
	}

	// Determine timeout
	timeout := defaultScriptTimeout
	if node.TimeoutSeconds > 0 {
		timeout = time.Duration(node.TimeoutSeconds) * time.Second
	}

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, command, args...)

	// If input is provided, pipe it to stdin
	if input != nil && len(input.Data) > 0 {
		cmd.Stdin = bytes.NewReader(input.Data)
	}

	// Capture stdout
	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	// Stream stderr to the process's own stderr
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		stderrStr := stderr.String()
		if stderrStr != "" {
			return nil, fmt.Errorf("command failed: %w\nstderr: %s", err, stderrStr)
		}
		return nil, fmt.Errorf("command failed: %w", err)
	}

	return &Output{
		Data:   stdout.Bytes(),
		Format: node.Output.Format,
	}, nil
}
