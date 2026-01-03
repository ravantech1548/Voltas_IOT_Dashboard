#!/bin/bash

# Test Login Script - Bash
# Tests the login API endpoint with admin credentials

API_URL="${API_URL:-http://localhost:5000}"
USERNAME="${1:-admin}"
PASSWORD="${2:-admin123}"

echo "========================================"
echo "Test Login Script"
echo "========================================"
echo ""
echo "Testing login with:"
echo "  API URL: $API_URL/api/auth/login"
echo "  Username: $USERNAME"
echo "  Password: $(echo $PASSWORD | sed 's/./*/g')"
echo ""
echo "Sending login request..."
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo "✓ Login successful!"
  echo ""
  echo "Response:"
  
  # Extract token using grep/sed (requires jq for better parsing, but using basic parsing)
  if command -v jq &> /dev/null; then
    token=$(echo "$body" | jq -r '.token')
    user_id=$(echo "$body" | jq -r '.user.id')
    username=$(echo "$body" | jq -r '.user.username')
    email=$(echo "$body" | jq -r '.user.email')
    role=$(echo "$body" | jq -r '.user.role')
    
    echo "  Token: ${token:0:50}..."
    echo "  User ID: $user_id"
    echo "  Username: $username"
    echo "  Email: $email"
    echo "  Role: $role"
    echo ""
    echo "Full token:"
    echo "$token"
    echo ""
    echo "To use this token in API requests, add this header:"
    echo "Authorization: Bearer $token"
  else
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    echo ""
    echo "Note: Install jq for better output formatting: sudo apt install jq"
  fi
else
  echo "✗ Login failed!"
  echo ""
  echo "Status Code: $http_code"
  echo "Response: $body"
  echo ""
  echo "Please check:"
  echo "  1. Backend server is running on $API_URL"
  echo "  2. The API URL is correct"
  echo "  3. Username and password are correct"
  exit 1
fi

echo ""


