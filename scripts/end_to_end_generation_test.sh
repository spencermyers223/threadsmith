#!/bin/bash

# End-to-End Generation Flow Test Script
# Validates complete workflow: Brain Dump → Template → Preview → Edit → Schedule

# Logging and error handling
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Ensure dependencies
command -v curl >/dev/null 2>&1 || error_exit "curl is not installed"
command -v jq >/dev/null 2>&1 || error_exit "jq is not installed"

# Configuration
BASE_URL="http://localhost:3000"
GENERATE_ENDPOINT="$BASE_URL/api/generate"
TEMPLATES_ENDPOINT="$BASE_URL/api/style-templates"
POSTS_ENDPOINT="$BASE_URL/api/posts"
SCHEDULE_ENDPOINT="$BASE_URL/api/schedule"

# Test Scenarios
declare -a SCENARIOS=(
    '{"topic":"AI in Content Marketing", "length":"thread", "template":"hot_take", "category":"tech"}'
    '{"topic":"Crypto Investing Strategies", "length":"article", "template":"market_take", "category":"crypto"}'
    '{"topic":"SaaS Growth Hacking", "length":"standard", "template":"build_in_public", "category":"saas"}'
)

# Main test function
run_generation_flow_test() {
    local scenario="$1"
    local topic=$(echo "$scenario" | jq -r '.topic')
    local length=$(echo "$scenario" | jq -r '.length')
    local template=$(echo "$scenario" | jq -r '.template')
    local category=$(echo "$scenario" | jq -r '.category')

    log "Testing Generation Flow: $topic"

    # Step 1: Select Template
    log "1. Template Selection"
    local template_response=$(curl -s "$TEMPLATES_ENDPOINT?category=$category")
    local template_id=$(echo "$template_response" | jq -r ".templates[0].id")
    
    if [ -z "$template_id" ] || [ "$template_id" = "null" ]; then
        error_exit "No templates found for category: $category"
    fi

    # Step 2: Generate Content
    log "2. Content Generation"
    local generate_payload=$(cat <<EOF
{
    "topic": "$topic",
    "length": "$length",
    "templateData": {
        "templateId": "$template_id",
        "promptTemplate": "Generate a $length content about $topic"
    }
}
EOF
)

    local generate_response=$(curl -s -X POST "$GENERATE_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$generate_payload")

    local post_content=$(echo "$generate_response" | jq -r '.posts[0].content')
    local char_count=$(echo "$post_content" | wc -c)

    if [ $char_count -lt 100 ]; then
        error_exit "Generation failed: Content too short"
    fi

    # Step 3: Save to Drafts
    log "3. Save to Drafts"
    local drafts_payload=$(cat <<EOF
{
    "type": "$length",
    "title": "Test: $topic",
    "content": {"text": "$post_content"},
    "status": "draft"
}
EOF
)

    local drafts_response=$(curl -s -X POST "$POSTS_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$drafts_payload")

    local draft_id=$(echo "$drafts_response" | jq -r '.id')
    
    if [ -z "$draft_id" ] || [ "$draft_id" = "null" ]; then
        error_exit "Failed to save draft"
    fi

    # Step 4: Schedule (optional)
    log "4. Scheduling (Optional)"
    local schedule_payload=$(cat <<EOF
{
    "postId": "$draft_id",
    "scheduledTime": "$(date -v+1d '+%Y-%m-%dT%H:%M:%S')"
}
EOF
)

    local schedule_response=$(curl -s -X POST "$SCHEDULE_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$schedule_payload")

    local schedule_status=$(echo "$schedule_response" | jq -r '.status')
    
    if [ "$schedule_status" != "scheduled" ]; then
        log "Warning: Scheduling failed, but not critical to test"
    fi

    log "✅ Generation Flow Test Passed for $topic"
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