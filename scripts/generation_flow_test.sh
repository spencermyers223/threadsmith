#!/bin/bash

# Generation Flow Test Script
# Validates: Brain Dump → Template → Preview → Edit → Schedule flow

# Ensure dependencies
command -v jq >/dev/null 2>&1 || { echo "jq is not installed. Abort."; exit 1; }

# Configuration
GENERATE_ENDPOINT="http://localhost:3000/api/generate"
DRAFTS_ENDPOINT="http://localhost:3000/api/posts"

# Test Scenarios
SCENARIOS=(
    '{"topic": "AI in Content Creation", "length": "standard", "postType": "scroll_stopper", "template": "hot_take"}'
    '{"topic": "Crypto Trends 2026", "length": "thread", "postType": "alpha_thread", "template": "market_take"}'
    '{"topic": "SaaS Growth Strategies", "length": "article", "postType": "build_in_public", "template": "build_in_public"}'
)

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Main test function
run_generation_flow_test() {
    local scenario="$1"
    local topic=$(echo "$scenario" | jq -r '.topic')
    local length=$(echo "$scenario" | jq -r '.length')
    local postType=$(echo "$scenario" | jq -r '.postType')

    log "Testing Generation Flow: $topic"

    # Step 1: Generate Content
    log "Step 1: Generating Content"
    local generate_response=$(curl -s -X POST "$GENERATE_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$scenario")

    # Validate generation
    local post_content=$(echo "$generate_response" | jq -r '.posts[0].content')
    local char_count=$(echo "$post_content" | wc -c)

    if [ $char_count -lt 100 ]; then
        log "❌ Generation Failed: Content too short"
        return 1
    fi

    # Step 2: Save to Drafts
    log "Step 2: Saving to Drafts"
    local save_response=$(curl -s -X POST "$DRAFTS_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"${length}\",
            \"title\": \"Test: $topic\",
            \"content\": {\"text\": $(echo "$post_content" | jq -R -s .)},
            \"status\": \"draft\"
        }")

    local draft_id=$(echo "$save_response" | jq -r '.id')
    if [ -z "$draft_id" ] || [ "$draft_id" = "null" ]; then
        log "❌ Draft Saving Failed"
        return 1
    fi

    log "✅ Generation Flow Test Passed for $topic"
    return 0
}

# Run tests
success_count=0
total_count=${#SCENARIOS[@]}

for scenario in "${SCENARIOS[@]}"; do
    run_generation_flow_test "$scenario"
    if [ $? -eq 0 ]; then
        ((success_count++))
    fi
done

# Final report
log "Test Results: $success_count/$total_count Scenarios Passed"
exit $((total_count - success_count))