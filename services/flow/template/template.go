package template

import (
	"fmt"
	"strings"
)

// PathResolver is implemented by RunContext to look up dot-paths.
type PathResolver interface {
	LookupPath(path string) (interface{}, error)
}

// Resolve replaces all {{...}} placeholders in the input string.
// Supported forms:
//   - {{nodes.NODE_ID.OUTPUT_NAME}}
//   - {{nodes.NODE_ID.OUTPUT_NAME.subfield}}
//   - {{env.VAR_NAME}}
func Resolve(input string, resolver PathResolver) (string, error) {
	var result strings.Builder
	remaining := input

	for {
		openIdx := strings.Index(remaining, "{{")
		if openIdx == -1 {
			result.WriteString(remaining)
			break
		}

		// Write everything before the opening {{
		result.WriteString(remaining[:openIdx])

		// Find the closing }}
		closeIdx := strings.Index(remaining[openIdx:], "}}")
		if closeIdx == -1 {
			// No closing brace — write the rest as-is
			result.WriteString(remaining[openIdx:])
			break
		}
		closeIdx += openIdx

		// Extract the path between {{ and }}
		path := strings.TrimSpace(remaining[openIdx+2 : closeIdx])

		val, err := resolver.LookupPath(path)
		if err != nil {
			return "", fmt.Errorf("resolving {{%s}}: %w", path, err)
		}

		// Format the resolved value
		switch v := val.(type) {
		case []byte:
			result.WriteString("[binary data]")
		case string:
			result.WriteString(v)
		case float64:
			// Format without trailing zeros when possible
			if v == float64(int64(v)) {
				result.WriteString(fmt.Sprintf("%d", int64(v)))
			} else {
				result.WriteString(fmt.Sprintf("%g", v))
			}
		default:
			result.WriteString(fmt.Sprintf("%v", v))
		}

		remaining = remaining[closeIdx+2:]
	}

	return result.String(), nil
}
