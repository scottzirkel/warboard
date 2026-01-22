#!/bin/bash

# ralph-once.sh - HITL (Human-in-the-Loop) Ralph
# Runs a single iteration of Claude Code
# Use this to watch Ralph work and refine your prompt

set -e  # Exit on error

echo "======================================"
echo "  Ralph (HITL Mode) - Single Iteration"
echo "======================================"
echo ""
echo "This will run ONE iteration of Ralph."
echo "Watch what happens and review the work."
echo ""
echo "Starting in 3 seconds..."
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

# Run Claude Code once
echo "Running Claude Code..."
echo "   (This may take 2-5 minutes per feature)"
echo ""

# Use claude from PATH, or fall back to common install locations
if command -v claude &> /dev/null; then
    CLAUDE_CMD="claude"
elif [ -f "$HOME/.claude/local/claude" ]; then
    CLAUDE_CMD="$HOME/.claude/local/claude"
else
    echo "ERROR: claude command not found"
    exit 1
fi

$CLAUDE_CMD --permission-mode acceptEdits \
    "@CLAUDE.md @PRD.jsonl @progress.txt

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

echo ""
echo "======================================"
echo "  Iteration Complete"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Review what Ralph did (check git log)"
echo "  2. Test the feature manually if needed"
echo "  3. Verify PRD.jsonl was updated correctly"
echo "  4. If satisfied, run again: ./ralph-once.sh"
echo "  5. Once confident, try: ./afk-ralph.sh 5"
echo ""
