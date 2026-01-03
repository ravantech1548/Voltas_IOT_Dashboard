#!/bin/bash

echo "========================================"
echo "Hash Admin Password Utility"
echo "========================================"
echo ""

cd backend || exit 1

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH!"
    echo ""
    echo "Please install Node.js to use this script."
    echo ""
    cd ..
    exit 1
fi

echo "This script will hash the admin password using bcrypt."
echo ""
echo "The hash can be used to:"
echo "  1. Update existing admin password in database"
echo "  2. Verify password hashing is working correctly"
echo "  3. Test password verification"
echo ""

if [ -z "$1" ]; then
    echo "Hashing default password: admin123"
    echo "(You can specify a different password as an argument)"
    echo ""
    node src/scripts/hashPassword.js admin123
else
    echo "Hashing password: $1"
    echo ""
    node src/scripts/hashPassword.js "$1"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Password hashing completed!"
    echo "========================================"
else
    echo ""
    echo "========================================"
    echo "Password hashing failed!"
    echo "========================================"
fi

cd ..
echo ""


