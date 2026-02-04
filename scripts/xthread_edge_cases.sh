#!/bin/bash

# Xthread Edge Case Testing Script

# Color codes
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

# Empty input test
test_empty_input() {
    echo -e "\n${YELLOW}Testing Empty Input Generation${NC}"
    
    # Use npx to run test
    npx tsx ./scripts/generation_edge_case.ts empty
    local result=$?
    log_test "Empty Input Handling" $result
}

# Very long input test
test_long_input() {
    echo -e "\n${YELLOW}Testing Long Input Generation${NC}"
    
    npx tsx ./scripts/generation_edge_case.ts long
    local result=$?
    log_test "Long Input Handling" $result
}

# Special characters test
test_special_characters() {
    echo -e "\n${YELLOW}Testing Special Character Generation${NC}"
    
    npx tsx ./scripts/generation_edge_case.ts special_chars
    local result=$?
    log_test "Special Character Handling" $result
}

# HTML/script injection test
test_injection_prevention() {
    echo -e "\n${YELLOW}Testing Injection Prevention${NC}"
    
    npx tsx ./scripts/generation_edge_case.ts injection
    local result=$?
    log_test "Injection Prevention" $result
}

# Unicode/multilingual test
test_unicode_input() {
    echo -e "\n${YELLOW}Testing Unicode/Multilingual Input${NC}"
    
    npx tsx ./scripts/generation_edge_case.ts unicode
    local result=$?
    log_test "Unicode Input Handling" $result
}

# Emoji input test
test_emoji_input() {
    echo -e "\n${YELLOW}Testing Emoji Input Generation${NC}"
    
    npx tsx ./scripts/generation_edge_case.ts emoji
    local result=$?
    log_test "Emoji Input Handling" $result
}

# Main test suite
main() {
    echo -e "${YELLOW}=== xthread Edge Case Testing ===${NC}"

    # Run all test functions
    test_empty_input
    test_long_input
    test_special_characters
    test_injection_prevention
    test_unicode_input
    test_emoji_input

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