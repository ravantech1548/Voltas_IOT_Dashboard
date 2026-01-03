#!/bin/bash

echo "Setting up Backend..."
cd backend

echo "Installing dependencies..."
npm install

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
PORT=5000
DATABASE_URL=postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF
    echo ".env file created. Please edit it with your database credentials."
fi

echo "Initializing database..."
node src/scripts/initDatabase.js

echo "Seeding database..."
npm run seed

echo "Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your database credentials"
echo "2. Run: npm run dev"
cd ..


