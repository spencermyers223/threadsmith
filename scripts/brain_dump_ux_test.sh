#!/bin/bash

# Brain Dump UX Test Script
# Validates: Brain Dump mode usability, invitingness, and generation quality

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Ensure dependencies
command -v curl >/dev/null 2>&1 || error_exit "curl is not installed"
command -v jq >/dev/null 2>&1 || error_exit "jq is not installed"

# Configuration
BASE_URL="http://localhost:3000"
BRAIN_DUMP_ENDPOINT="$BASE_URL/api/braindump"

# Test Scenarios
declare -a BRAIN_DUMP_INPUTS=(
    "tech startup idea about AI content creation"
    "random thoughts about productivity and creativity"
    "personal reflection on career growth in tech"
    "stream of consciousness about future of work"
    ""  # Empty input to test edge case
)

# Usability Metrics Function
evaluate_brain_dump_ux() {
    local input="$1"
    log "Testing Brain Dump Input: ${input:-[EMPTY]}"

    # Simulate brain dump generation
    local brain_dump_payload=$(cat <<EOF
{
    "input": "$input",
    "mode": "generate"
}
EOF
)

    local brain_dump_response=$(curl -s -X POST "$BRAIN_DUMP_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$brain_dump_payload")

    # Parse response
    local output_text=$(echo "$brain_dump_response" | jq -r '.output')
    local word_count=$(echo "$output_text" | wc -w)
    local generation_method=$(echo "$brain_dump_response" | jq -r '.generationMethod')
    local content_type=$(echo "$brain_dump_response" | jq -r '.contentType')

    # Validation checks
    if [ -z "$output_text" ]; then
        error_exit "No output generated for input: ${input:-[EMPTY]}"
    fi

    if [ $word_count -lt 20 ]; then
        error_exit "Brain dump output too short (< 20 words)"
    fi

    # UX Evaluation Metrics
    log "🔍 UX Metrics for '${input:-[EMPTY]}':"
    log "   - Output Length: $word_count words"
    log "   - Generation Method: $generation_method"
    log "   - Content Type: $content_type"
    log "   - Output Sample: ${output_text:0:100}..."

    # Additional UX checks
    case "$generation_method" in
        "direct"|"contextual"|"creative")
            log "✅ Appropriate generation method" ;;
        *)
            error_exit "Unexpected generation method: $generation_method" ;;
    esac

    case "$content_type" in
        "tweet"|"thread"|"notes"|"outline"|"freeform")
            log "✅ Appropriate content type" ;;
        *)
            error_exit "Unexpected content type: $content_type" ;;
    esac
}

# Run Brain Dump Tests
success_count=0
total_count=${#BRAIN_DUMP_INPUTS[@]}

for input in "${BRAIN_DUMP_INPUTS[@]}"; do
    evaluate_brain_dump_ux "$input"
    if [ $? -eq 0 ]; then
        ((success_count++))
    fi
done

# Final report
log "Brain Dump UX Test Results: $success_count/$total_count Scenarios Passed"
exit $((total_count - success_count))