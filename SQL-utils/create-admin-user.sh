#!/bin/bash

echo "========================================"
echo "Create Admin User Script"
echo "========================================"
echo ""
echo "This script will create an admin user with:"
echo "  Username: admin"
echo "  Password: admin123"
echo "  Role: admin"
echo ""
echo "If the database schema doesn't exist, it will be created first."
echo ""
read -p "Press Enter to continue..."

cd backend

if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo ""
    echo "Please create .env file first or run setup-backend.sh"
    echo ""
    exit 1
fi

echo ""
echo "Creating admin user..."
echo ""

npm run create-admin

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Admin user created successfully!"
    echo "========================================"
    echo ""
    echo "You can now login with:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
else
    echo ""
    echo "========================================"
    echo "Failed to create admin user!"
    echo "========================================"
    echo ""
    echo "Please check the error messages above."
    echo ""
    exit 1
fi

cd ..


