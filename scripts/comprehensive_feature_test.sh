#!/bin/bash

# Comprehensive xthread Feature Testing Script

# Ensure we're in the right directory
cd /Users/jarvis/clawd/repos/threadsmith

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Results Tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging function
log_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$2" -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED:${NC} $1"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED:${NC} $1"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Generate content and validate
test_content_generation() {
    local content_type=$1
    local niche=$2
    local template=$3

    echo -e "\n${YELLOW}Testing ${content_type} Generation (${niche} - ${template})${NC}"

    # Use npx to run a test generation
    npx tsx ./scripts/generation_test.ts \
        --type "${content_type}" \
        --niche "${niche}" \
        --template "${template}"

    local result=$?
    log_test "Generation Test: ${content_type} (${niche} - ${template})" $result
}

# Test preset system
test_preset_system() {
    echo -e "\n${YELLOW}Testing Preset System${NC}"

    # Create a new preset
    npx tsx ./scripts/preset_test.ts create
    local create_result=$?
    log_test "Create Preset" $create_result

    # Apply preset
    npx tsx ./scripts/preset_test.ts apply
    local apply_result=$?
    log_test "Apply Preset" $apply_result
}

# Edge case testing
test_edge_cases() {
    echo -e "\n${YELLOW}Testing Edge Cases${NC}"

    # Test empty input
    npx tsx ./scripts/edge_case_test.ts empty_input
    local empty_result=$?
    log_test "Empty Input Handling" $empty_result

    # Test very long input
    npx tsx ./scripts/edge_case_test.ts long_input
    local long_result=$?
    log_test "Long Input Handling" $long_result

    # Test special characters
    npx tsx ./scripts/edge_case_test.ts special_chars
    local chars_result=$?
    log_test "Special Characters Handling" $chars_result
}

# Generation flow test
test_generation_flow() {
    echo -e "\n${YELLOW}Testing End-to-End Generation Flow${NC}"

    # Full flow: Brain Dump → Template → Preview → Edit → Schedule
    npx tsx ./scripts/flow_test.ts full_generation_flow
    local flow_result=$?
    log_test "Full Generation Flow" $flow_result
}

# Main test suite
main() {
    echo -e "${YELLOW}=== xthread Comprehensive Feature Testing ===${NC}"

    # Content Type Tests
    test_content_generation "article" "tech" "market_analysis"
    test_content_generation "thread" "crypto" "alpha_thread"
    test_content_generation "tweet" "ai" "build_in_public"

    # Preset System Test
    test_preset_system

    # Edge Cases
    test_edge_cases

    # Generation Flow
    test_generation_flow

    # Final Summary
    echo -e "\n${YELLOW}=== Test Summary ===${NC}"
    echo -e "Total Tests: ${TOTAL_TESTS}"
    echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
    echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

    # Exit with failure if any tests failed
    [ $FAILED_TESTS -eq 0 ]
}

# Run main and capture exit status
main
EXIT_STATUS=$?

exit $EXIT_STATUS