@echo off
echo Setting up Frontend...
cd frontend

echo Installing dependencies...
call npm install

if not exist .env (
    echo Creating .env file...
    (
        echo REACT_APP_API_URL=http://localhost:5000/api
        echo REACT_APP_WS_URL=http://localhost:5000
    ) > .env
)

echo Frontend setup complete!
echo.
echo To start the frontend, run: npm start
cd ..
pause


