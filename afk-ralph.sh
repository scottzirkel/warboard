#!/bin/bash

# afk-ralph.sh - AFK (Away From Keyboard) Ralph
# Runs Ralph in a loop with max iterations
# Use this once your prompt is refined and you trust the output
#
# Usage: ./afk-ralph.sh [iterations] [--sandbox] [--status]
#   iterations: max iterations (default: 10)
#   --sandbox:  run in Docker sandbox for safety (recommended for AFK)
#   --status:   show locked/available tasks and exit
#
# PARALLEL EXECUTION:
#   Run multiple instances in separate terminals - each will claim
#   different tasks using file locking to avoid conflicts.
#
# Examples:
#   ./afk-ralph.sh 10           # Run 10 iterations
#   ./afk-ralph.sh 10 &         # Run in background
#   ./afk-ralph.sh --status     # Check what's running

set -e  # Exit on error

# Parse arguments
MAX_ITERATIONS=10
USE_SANDBOX=false
SHOW_STATUS=false

for arg in "$@"; do
    case $arg in
        --sandbox)
            USE_SANDBOX=true
            ;;
        --status)
            SHOW_STATUS=true
            ;;
        [0-9]*)
            MAX_ITERATIONS=$arg
            ;;
    esac
done

# Status mode - just show locked/available tasks and exit
if [ "$SHOW_STATUS" = true ]; then
    echo "PRD Task Status"
    echo "==============="
    echo ""

    echo "Locked tasks:"
    locked_count=0
    while IFS= read -r line || [[ -n "$line" ]]; do
        locked=$(echo "$line" | jq -r '.lockedBy // empty')
        if [[ -n "$locked" ]]; then
            id=$(echo "$line" | jq -r '.id')
            at=$(echo "$line" | jq -r '.lockedAt // "unknown"')
            echo "  $id - locked by $locked at $at"
            locked_count=$((locked_count + 1))
        fi
    done < PRD.jsonl
    [[ $locked_count -eq 0 ]] && echo "  (none)"

    echo ""
    echo "Available tasks (unlocked, deps met):"
    avail_count=0
    while IFS= read -r line || [[ -n "$line" ]]; do
        passes=$(echo "$line" | jq -r '.passes // false')
        locked=$(echo "$line" | jq -r '.lockedBy // empty')
        id=$(echo "$line" | jq -r '.id')

        [[ "$passes" == "true" ]] && continue
        [[ -n "$locked" ]] && continue

        deps=$(echo "$line" | jq -r '.dependencies // [] | .[]')
        deps_met=true
        for dep in $deps; do
            dep_passes=$(grep "\"id\":\"$dep\"" PRD.jsonl | jq -r '.passes // false')
            [[ "$dep_passes" != "true" ]] && deps_met=false && break
        done

        if [[ "$deps_met" == "true" ]]; then
            desc=$(echo "$line" | jq -r '.description')
            echo "  $id - $desc"
            avail_count=$((avail_count + 1))
        fi
    done < PRD.jsonl
    [[ $avail_count -eq 0 ]] && echo "  (none)"

    echo ""
    complete=$(grep -c '"passes":true' PRD.jsonl || true)
    incomplete=$(grep -c '"passes":false' PRD.jsonl || true)
    echo "Progress: $complete complete, $incomplete remaining, $locked_count locked"
    exit 0
fi

# Locking setup
PRD_FILE="PRD.jsonl"
LOCK_DIR=".prd_lock"
RUNNER_ID="$(hostname)-$$-$(date +%s)"
CLAIMED_TASK=""

# Acquire file lock using mkdir (atomic on macOS and Linux)
acquire_lock() {
    local max_attempts=50
    local attempt=0
    while ! mkdir "$LOCK_DIR" 2>/dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            echo "ERROR: Could not acquire lock after $max_attempts attempts" >&2
            return 1
        fi
        sleep 0.2
    done
    return 0
}

# Release file lock
release_lock() {
    rmdir "$LOCK_DIR" 2>/dev/null || true
}

# Claim a task atomically - returns task ID or "NO_TASK"
claim_task() {
    acquire_lock || { echo "NO_TASK"; return; }

    local task_id=""
    local task_line=""
    local line_num=0

    while IFS= read -r line || [[ -n "$line" ]]; do
        line_num=$((line_num + 1))
        [[ -z "$line" ]] && continue

        local passes=$(echo "$line" | jq -r '.passes // false')
        local locked=$(echo "$line" | jq -r '.lockedBy // empty')
        local id=$(echo "$line" | jq -r '.id')

        [[ "$passes" == "true" ]] && continue
        [[ -n "$locked" ]] && continue

        # Check dependencies
        local deps=$(echo "$line" | jq -r '.dependencies // [] | .[]')
        local deps_met=true

        for dep in $deps; do
            local dep_passes=$(grep "\"id\":\"$dep\"" "$PRD_FILE" | jq -r '.passes // false')
            if [[ "$dep_passes" != "true" ]]; then
                deps_met=false
                break
            fi
        done

        if [[ "$deps_met" == "true" ]]; then
            task_id="$id"
            task_line="$line_num"
            break
        fi
    done < "$PRD_FILE"

    if [[ -z "$task_id" ]]; then
        release_lock
        echo "NO_TASK"
        return
    fi

    # Claim the task
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local temp_file=$(mktemp)

    line_num=0
    while IFS= read -r line || [[ -n "$line" ]]; do
        line_num=$((line_num + 1))
        if [[ $line_num -eq $task_line ]]; then
            echo "$line" | jq -c ". + {lockedBy: \"$RUNNER_ID\", lockedAt: \"$timestamp\"}"
        else
            echo "$line"
        fi
    done < "$PRD_FILE" > "$temp_file"

    mv "$temp_file" "$PRD_FILE"
    release_lock
    echo "$task_id"
}

# Release a task (on failure/interrupt)
release_task() {
    local task_id="$1"
    [[ -z "$task_id" ]] && return

    acquire_lock || { echo "Warning: Could not acquire lock to release task" >&2; return; }

    local temp_file=$(mktemp)
    while IFS= read -r line || [[ -n "$line" ]]; do
        local id=$(echo "$line" | jq -r '.id // empty')
        if [[ "$id" == "$task_id" ]]; then
            echo "$line" | jq -c 'del(.lockedBy, .lockedAt)'
        else
            echo "$line"
        fi
    done < "$PRD_FILE" > "$temp_file"

    mv "$temp_file" "$PRD_FILE"
    release_lock

    echo "Released lock: $task_id"
}

# Cleanup on exit
cleanup() {
    if [[ -n "$CLAIMED_TASK" ]]; then
        echo ""
        echo "Releasing lock on $CLAIMED_TASK..."
        release_task "$CLAIMED_TASK"
        CLAIMED_TASK=""
    fi
    # Kill spinner if running
    [[ -n "${SPINNER_PID:-}" ]] && kill $SPINNER_PID 2>/dev/null || true
}

# Handle Ctrl+C - cleanup and exit immediately
handle_interrupt() {
    echo ""
    echo "Interrupted! Cleaning up..."
    cleanup
    exit 130
}
trap handle_interrupt INT TERM
trap cleanup EXIT

echo "======================================"
echo "  Ralph (AFK Mode) - Multi-Iteration"
echo "======================================"
echo ""
echo "Runner ID: $RUNNER_ID"
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

# Prompt template - task ID will be inserted
get_prompt() {
    local task_id="$1"
    cat <<EOF
@CLAUDE.md @PRD.jsonl @progress.txt

ASSIGNED TASK: $task_id
You have been assigned task "$task_id". Find it in PRD.jsonl and implement it.
Do NOT work on any other task. This task has been locked for you.

IMPLEMENTATION:
Implement the assigned feature following CLAUDE.md conventions.
Keep changes small and focused - one logical change per commit.
Quality over speed. Small steps compound into big progress.

FEEDBACK LOOPS (all must pass before committing):
1. Run npm run lint (ESLint)
2. Run npm run typecheck (TypeScript validation)
3. Run npm run test (Vitest unit tests - write tests if needed)
4. Run npm run build (Next.js build)
Or use: npm run validate (runs all 4 in sequence)
Do NOT commit if any feedback loop fails. Fix issues first.
Do NOT push to remote - only commit locally.

COMMIT:
Update progress.txt with: task completed, decisions made, files changed.
Update PRD.jsonl to mark the feature passes:true (remove lockedBy and lockedAt fields).
Stage ALL changes (code + progress.txt + PRD.jsonl) and commit together.
Commit message format: [$task_id] Description

ONLY IMPLEMENT THE ASSIGNED TASK: $task_id
Do NOT output any promise tags. Just complete the task and commit.
EOF
}

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

    # Claim next available task
    TIMESTAMP=$(date "+%H:%M:%S")
    echo "[$TIMESTAMP] Claiming task..."
    CLAIMED_TASK=$(claim_task)

    if [[ "$CLAIMED_TASK" == "NO_TASK" ]]; then
        # Check if tasks are locked by other runners or truly complete
        INCOMPLETE=$(grep -c '"passes":false' PRD.jsonl || true)
        LOCKED=$(grep -c '"lockedBy"' PRD.jsonl || true)

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
            CLAIMED_TASK=""
            exit 0
        else
            echo "[$TIMESTAMP] No available tasks (${LOCKED} locked, waiting...)"
            sleep 10
            continue
        fi
    fi

    # Show status
    COMPLETE_COUNT=$(grep -c '"passes":true' PRD.jsonl || true)
    INCOMPLETE=$(grep -c '"passes":false' PRD.jsonl || true)
    TOTAL_COUNT=$((COMPLETE_COUNT + INCOMPLETE))

    echo "[$TIMESTAMP] Claimed: $CLAIMED_TASK"
    echo "[$TIMESTAMP] Progress: $COMPLETE_COUNT/$TOTAL_COUNT features complete"

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
    RALPH_PROMPT=$(get_prompt "$CLAIMED_TASK")
    result=$($CLAUDE_CMD -p --permission-mode acceptEdits "$RALPH_PROMPT" 2>&1) || true

    # Stop spinner
    kill $SPINNER_PID 2>/dev/null
    wait $SPINNER_PID 2>/dev/null || true

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    # Clear the spinner line
    printf "\r[$TIMESTAMP] Running Claude Code... done (%ds)        \n" $DURATION

    echo "$result"

    # Check if Claude produced output (indicates success)
    if [ -n "$result" ]; then
        FEATURES_COMPLETED=$((FEATURES_COMPLETED + 1))
        TIMESTAMP=$(date "+%H:%M:%S")
        echo ""
        echo "[$TIMESTAMP] Iteration $i complete: $CLAIMED_TASK (${DURATION}s)"
        # Task was completed by Claude (passes:true set, lock removed)
        # Clear our local tracking so cleanup doesn't try to release again
        CLAIMED_TASK=""
    else
        TIMESTAMP=$(date "+%H:%M:%S")
        echo ""
        echo "[$TIMESTAMP] Iteration $i produced no output for $CLAIMED_TASK"
        echo "Releasing lock and stopping..."
        # Lock will be released by cleanup trap
        echo ""
        echo "Summary:"
        echo "  - Completed $FEATURES_COMPLETED features"
        echo "  - Failed at iteration $i on task: $CLAIMED_TASK"
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
