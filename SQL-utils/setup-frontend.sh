#!/bin/bash

echo "Setting up Frontend..."
cd frontend

echo "Installing dependencies..."
npm install

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
EOF
fi

echo "Frontend setup complete!"
echo ""
echo "To start the frontend, run: npm start"
cd ..


