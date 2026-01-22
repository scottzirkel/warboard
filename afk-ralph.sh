#!/bin/bash

# afk-ralph.sh - AFK (Away From Keyboard) Ralph
# Runs Ralph in a loop with max iterations
# Use this once your prompt is refined and you trust the output
#
# Usage: ./afk-ralph.sh [iterations] [--sandbox]
#   iterations: max iterations (default: 10)
#   --sandbox:  run in Docker sandbox for safety (recommended for AFK)

set -e  # Exit on error

# Parse arguments
MAX_ITERATIONS=10
USE_SANDBOX=false

for arg in "$@"; do
    case $arg in
        --sandbox)
            USE_SANDBOX=true
            ;;
        [0-9]*)
            MAX_ITERATIONS=$arg
            ;;
    esac
done

echo "======================================"
echo "  Ralph (AFK Mode) - Multi-Iteration"
echo "======================================"
echo ""
echo "Max iterations: $MAX_ITERATIONS"
if [ "$USE_SANDBOX" = true ]; then
    echo "Mode: Docker Sandbox (isolated)"
else
    echo "Mode: Local (use --sandbox for isolation)"
fi
echo ""
echo "Starting in 3 seconds... (Ctrl+C to cancel)"
echo ""
sleep 3

# Check required files
if [ ! -f "PRD.jsonl" ]; then
    echo "ERROR: PRD.jsonl not found"
    exit 1
fi

if [ ! -f "CLAUDE.md" ]; then
    echo "WARNING: CLAUDE.md not found"
    echo ""
fi

# Create progress.txt if it doesn't exist
touch progress.txt

# Set up Claude command based on sandbox mode
if [ "$USE_SANDBOX" = true ]; then
    CLAUDE_CMD="docker sandbox run claude"
else
    # Use claude from PATH, or fall back to common install locations
    if command -v claude &> /dev/null; then
        CLAUDE_CMD="claude"
    elif [ -f "$HOME/.claude/local/claude" ]; then
        CLAUDE_CMD="$HOME/.claude/local/claude"
    else
        echo "ERROR: claude command not found"
        exit 1
    fi
fi

# The prompt (same for both modes)
RALPH_PROMPT="@CLAUDE.md @PRD.jsonl @progress.txt

TASK SELECTION:
Read the project guidelines, PRD, and progress file.
Find incomplete features (passes:false with met dependencies).
Prioritize in this order:
1. Architectural decisions and core abstractions
2. Integration points between modules
3. Unknown unknowns and spike work
4. Standard features and implementation
5. Polish, cleanup, and quick wins

IMPLEMENTATION:
Implement ONE feature following CLAUDE.md conventions.
Keep changes small and focused - one logical change per commit.
Quality over speed. Small steps compound into big progress.

FEEDBACK LOOPS (all must pass before committing):
1. Run npm run build (Vite build)
2. Test manually in browser if needed
Do NOT commit if any feedback loop fails. Fix issues first.

COMMIT:
Update progress.txt with: task completed, decisions made, files changed.
Update PRD.jsonl to mark the feature passes:true.
Stage ALL changes (code + progress.txt + PRD.jsonl) and commit together.
Commit message format: [feature-id] Description

ONLY DO ONE FEATURE.
If all features are complete, output <promise>COMPLETE</promise>."

# Track completed features and time
FEATURES_COMPLETED=0
TOTAL_START_TIME=$(date +%s)

# Run iterations
for ((i=1; i<=$MAX_ITERATIONS; i++)); do
    echo ""
    echo "======================================"
    echo "  Iteration $i of $MAX_ITERATIONS"
    echo "======================================"
    echo ""

    # Check if there are any incomplete features
    INCOMPLETE=$(grep -c '"passes":false' PRD.jsonl || true)

    if [ "$INCOMPLETE" -eq 0 ]; then
        TOTAL_END_TIME=$(date +%s)
        TOTAL_DURATION=$((TOTAL_END_TIME - TOTAL_START_TIME))
        TOTAL_MINS=$((TOTAL_DURATION / 60))
        TOTAL_SECS=$((TOTAL_DURATION % 60))
        echo "All features complete!"
        echo ""
        echo "Summary:"
        echo "  - Completed $FEATURES_COMPLETED features in $i iterations"
        echo "  - Total time: ${TOTAL_MINS}m ${TOTAL_SECS}s"
        echo ""
        exit 0
    fi

    # Show status
    COMPLETE_COUNT=$(grep -c '"passes":true' PRD.jsonl || true)
    TOTAL_COUNT=$((COMPLETE_COUNT + INCOMPLETE))
    TIMESTAMP=$(date "+%H:%M:%S")

    echo "[$TIMESTAMP] Progress: $COMPLETE_COUNT/$TOTAL_COUNT features complete"
    echo "[$TIMESTAMP] Remaining: $INCOMPLETE features"

    # Show next likely feature (first incomplete one)
    NEXT_FEATURE=$(grep '"passes":false' PRD.jsonl | head -1 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$NEXT_FEATURE" ]; then
        echo "[$TIMESTAMP] Next up: $NEXT_FEATURE"
    fi

    echo ""
    echo -n "[$TIMESTAMP] Running Claude Code... "
    START_TIME=$(date +%s)

    # Start a background spinner with elapsed time
    (
        spinner='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
        while true; do
            for (( j=0; j<${#spinner}; j++ )); do
                elapsed=$(($(date +%s) - START_TIME))
                mins=$((elapsed / 60))
                secs=$((elapsed % 60))
                printf "\r[$TIMESTAMP] Running Claude Code... ${spinner:$j:1} %02d:%02d " $mins $secs
                sleep 0.1
            done
        done
    ) &
    SPINNER_PID=$!

    # Run Claude Code and capture output
    result=$($CLAUDE_CMD -p --permission-mode acceptEdits "$RALPH_PROMPT" 2>&1) || true

    # Stop spinner
    kill $SPINNER_PID 2>/dev/null
    wait $SPINNER_PID 2>/dev/null || true

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    # Clear the spinner line
    printf "\r[$TIMESTAMP] Running Claude Code... done (%ds)        \n" $DURATION

    echo "$result"

    # Check for completion sigil
    if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
        TOTAL_END_TIME=$(date +%s)
        TOTAL_DURATION=$((TOTAL_END_TIME - TOTAL_START_TIME))
        TOTAL_MINS=$((TOTAL_DURATION / 60))
        TOTAL_SECS=$((TOTAL_DURATION % 60))
        echo ""
        echo "======================================"
        echo "  PRD Complete!"
        echo "======================================"
        echo ""
        echo "Summary:"
        echo "  - Completed $FEATURES_COMPLETED features in $i iterations"
        echo "  - Total time: ${TOTAL_MINS}m ${TOTAL_SECS}s"
        echo ""
        exit 0
    fi

    # Check if Claude produced output (indicates success)
    if [ -n "$result" ]; then
        FEATURES_COMPLETED=$((FEATURES_COMPLETED + 1))
        TIMESTAMP=$(date "+%H:%M:%S")
        echo ""
        echo "[$TIMESTAMP] Iteration $i complete (${DURATION}s)"
    else
        TIMESTAMP=$(date "+%H:%M:%S")
        echo ""
        echo "[$TIMESTAMP] Iteration $i produced no output - stopping"
        echo ""
        echo "Summary:"
        echo "  - Completed $FEATURES_COMPLETED features"
        echo "  - Stopped at iteration $i"
        echo ""
        echo "Check git log for details"
        exit 1
    fi

    # Brief pause between iterations
    sleep 2
done

TOTAL_END_TIME=$(date +%s)
TOTAL_DURATION=$((TOTAL_END_TIME - TOTAL_START_TIME))
TOTAL_MINS=$((TOTAL_DURATION / 60))
TOTAL_SECS=$((TOTAL_DURATION % 60))

echo ""
echo "======================================"
echo "  Max Iterations Reached"
echo "======================================"
echo ""

# Check remaining work
INCOMPLETE=$(grep -c '"passes":false' PRD.jsonl || true)

echo "Summary:"
echo "  - Completed $FEATURES_COMPLETED features"
echo "  - Remaining: $INCOMPLETE features"
echo "  - Total time: ${TOTAL_MINS}m ${TOTAL_SECS}s"
echo ""

if [ "$INCOMPLETE" -gt 0 ]; then
    echo "To continue, run:"
    echo "  ./afk-ralph.sh $MAX_ITERATIONS"
    echo ""
else
    echo "All features complete!"
    echo ""
fi
