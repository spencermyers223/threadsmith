#!/bin/bash

# Template Workflow Test Script
# Validates: Template creation, application, and generation process

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
TEMPLATES_ENDPOINT="$BASE_URL/api/style-templates"
GENERATE_ENDPOINT="$BASE_URL/api/generate"

# Test Scenarios for Template Creation and Application
declare -a TEMPLATE_SCENARIOS=(
    '{"title":"Tech Startup Pitch", "category":"saas", "description":"Compelling startup pitch template", "variables":[{"name":"problem","label":"Problem Statement","required":true},{"name":"solution","label":"Proposed Solution","required":true}]}'
    '{"title":"Crypto Market Take", "category":"crypto", "description":"Contrarian crypto market analysis", "variables":[{"name":"market","label":"Market Segment","required":true},{"name":"trend","label":"Current Trend","required":true}]}'
    '{"title":"AI Ethics Debate", "category":"ai", "description":"Thought-provoking AI ethics thread", "variables":[{"name":"technology","label":"AI Technology","required":true},{"name":"concern","label":"Ethical Concern","required":true}]}'
)

# Generation test function
test_template_workflow() {
    local template_payload="$1"
    local title=$(echo "$template_payload" | jq -r '.title')
    local category=$(echo "$template_payload" | jq -r '.category')

    log "Testing Template Workflow: $title"

    # Step 1: Create Template
    local create_response=$(curl -s -X POST "$TEMPLATES_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$template_payload")

    local template_id=$(echo "$create_response" | jq -r '.id')
    
    if [ -z "$template_id" ] || [ "$template_id" = "null" ]; then
        error_exit "Failed to create template: $title"
    fi

    log "✅ Template Created: $title (ID: $template_id)"

    # Step 2: Generate from Template
    local variable_values=$(echo "$template_payload" | jq '.variables | map({(.name): "Test \(.label)"}) | add')
    
    local generate_payload=$(cat <<EOF
{
    "topic": "Using template: $title",
    "length": "thread",
    "templateData": {
        "templateId": "$template_id",
        "variableValues": $variable_values
    }
}
EOF
)

    local generate_response=$(curl -s -X POST "$GENERATE_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$generate_payload")

    # Validate generation
    local generated_content=$(echo "$generate_response" | jq -r '.posts[0].content')
    local char_count=$(echo "$generated_content" | wc -c)
    
    if [ $char_count -lt 100 ]; then
        error_exit "Generation failed for template: $title (content too short)"
    fi

    # Validate content includes template variables
    for var in $(echo "$template_payload" | jq -r '.variables[].label'); do
        if ! echo "$generated_content" | grep -q "$var"; then
            error_exit "Generated content missing template variable: $var"
        fi
    done

    log "✅ Template Generation Successful: $title"
    log "   Generated Content Preview: ${generated_content:0:200}..."
}

# Run tests
success_count=0
total_count=${#TEMPLATE_SCENARIOS[@]}

for scenario in "${TEMPLATE_SCENARIOS[@]}"; do
    test_template_workflow "$scenario"
    if [ $? -eq 0 ]; then
        ((success_count++))
    fi
done

# Final report
log "Template Workflow Test Results: $success_count/$total_count Scenarios Passed"
exit $((total_count - success_count))