#!/bin/bash

# Edge Case Generation Test Script
# Tests content generation with various challenging inputs

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
GENERATE_ENDPOINT="http://localhost:3000/api/generate"

# Edge Case Scenarios
declare -a EDGE_CASES=(
    # Empty or near-empty inputs
    '{"topic":"", "description":"Empty input"}'
    '{"topic":"a", "description":"Single character input"}'
    
    # Special characters
    '{"topic":"AI & Machine Learning: $#@! Crazy Stuff", "description":"Special characters"}'
    
    # Unicode and international characters
    '{"topic":"こんにちは世界 (Hello World in Japanese)", "description":"Unicode input"}'
    
    # Very long inputs
    '{"topic":"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.", "description":"Extremely long input"}'
    
    # Potential injection attempts
    '{"topic":"<script>alert(\"XSS\")</script>", "description":"XSS attempt"}'
    
    # Multiple languages
    '{"topic":"AI in Tech: English 中文 Español Русский", "description":"Multilingual input"}'
)

# Different content types to test
declare -a CONTENT_TYPES=(
    'tweet'
    'thread'
    'article'
)

# Test function
run_edge_case_test() {
    local scenario="$1"
    local content_type="$2"
    local topic=$(echo "$scenario" | jq -r '.topic')
    local description=$(echo "$scenario" | jq -r '.description')

    log "Testing Edge Case: $description (Type: $content_type)"

    # Generate payload
    local generate_payload=$(cat <<EOF
{
    "topic": "$topic",
    "length": "$content_type",
    "postType": "scroll_stopper",
    "tone": "casual"
}
EOF
)

    # Perform generation
    local generate_response=$(curl -s -X POST "$GENERATE_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$generate_payload")

    # Validate response
    local post_content=$(echo "$generate_response" | jq -r '.posts[0].content')
    local char_count=$(echo "$post_content" | wc -c)
    local error_message=$(echo "$generate_response" | jq -r '.error // empty')

    # Content type specific validations
    case "$content_type" in
        'tweet')
            if [ $char_count -gt 280 ]; then
                error_exit "Tweet exceeded 280 characters for edge case: $description"
            fi
            ;;
        'thread')
            if ! echo "$post_content" | grep -qE '^1/|^2/'; then
                error_exit "Thread lacks proper tweet numbering for edge case: $description"
            fi
            ;;
        'article')
            if [ $char_count -lt 800 ]; then
                error_exit "Article too short for edge case: $description"
            fi
            ;;
    esac

    # Check for any error messages
    if [ -n "$error_message" ]; then
        log "Warning: Generation returned error for $description: $error_message"
    fi

    log "✅ Edge Case Test Passed: $description (Type: $content_type)"
}

# Run tests
success_count=0
total_count=$((${#EDGE_CASES[@]} * ${#CONTENT_TYPES[@]}))

for scenario in "${EDGE_CASES[@]}"; do
    for content_type in "${CONTENT_TYPES[@]}"; do
        run_edge_case_test "$scenario" "$content_type"
        if [ $? -eq 0 ]; then
            ((success_count++))
        fi
    done
done

# Final report
log "Edge Case Test Results: $success_count/$total_count Scenarios Passed"
exit $((total_count - success_count))