#!/bin/bash

echo "========================================"
echo "Seed Initial Data"
echo "========================================"
echo ""
echo "This script will populate the database with:"
echo "  Clients: Voltas, Qautomation"
echo "  Departments: Engineering, Operations"
echo "  Locations: CBE-South, CBE-North"
echo "  Sensors: ch01, ch02, ch03, ch04, ch05, ch06"
echo "  Sensor Types: Temperature, Humidity, Pressure"
echo ""

cd backend

if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo ""
    echo "Please create .env file first."
    echo ""
    exit 1
fi

echo "Running seed script..."
echo ""

npm run seed-initial

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Initial data seeded successfully!"
    echo "========================================"
else
    echo ""
    echo "========================================"
    echo "Seeding failed!"
    echo "========================================"
fi

cd ..


