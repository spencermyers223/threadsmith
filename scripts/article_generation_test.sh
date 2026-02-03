#!/bin/bash

# Article Generation Test Script
# Usage: ./article_generation_test.sh "Topic" length_type

TOPIC="$1"
LENGTH_TYPE="${2:-developed}"

# Validate inputs
if [ -z "$TOPIC" ]; then
    echo "Error: Must provide a topic"
    exit 1
fi

# Generate article via curl
RESPONSE=$(curl -s -X POST 'http://localhost:3000/api/generate' \
    -H 'Content-Type: application/json' \
    -d "{
        \"topic\": \"$TOPIC\",
        \"length\": \"$LENGTH_TYPE\",
        \"postType\": \"article\",
        \"tone\": \"professional\"
    }")

# Check response
WORD_COUNT=$(echo "$RESPONSE" | jq -r '.posts[0].content' | wc -w)
CHAR_COUNT=$(echo "$RESPONSE" | jq -r '.posts[0].content' | wc -c)

echo "Word Count: $WORD_COUNT"
echo "Character Count: $CHAR_COUNT"

# Basic validation
if [ "$WORD_COUNT" -lt 800 ]; then
    echo "❌ Article too short (< 800 words)"
    exit 1
fi

echo "✅ Article generation successful"
exit 0