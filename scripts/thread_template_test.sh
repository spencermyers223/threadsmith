#!/bin/bash

# Thread Template Testing Script

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

# Run thread template tests
run_thread_template_tests() {
    echo -e "\n${YELLOW}=== Thread Template Testing ===${NC}"
    
    # Run the TypeScript test script
    npx tsx ./scripts/thread_template_test.ts
    local result=$?
    log_test "Thread Template Generation" $result
}

# Main test suite
main() {
    # Run tests
    run_thread_template_tests

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