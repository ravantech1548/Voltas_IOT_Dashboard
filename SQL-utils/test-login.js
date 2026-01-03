// Test Login Script - Node.js
// Tests the login API endpoint with admin credentials

const http = require('http');
const https = require('https');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const USERNAME = process.argv[2] || 'admin';
const PASSWORD = process.argv[3] || 'admin123';

const testLogin = () => {
  const url = new URL(`${API_URL}/api/auth/login`);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const postData = JSON.stringify({
    username: USERNAME,
    password: PASSWORD
  });

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 5000
  };

  console.log('========================================');
  console.log('Testing Login API');
  console.log('========================================');
  console.log(`API URL: ${API_URL}/api/auth/login`);
  console.log(`Username: ${USERNAME}`);
  console.log(`Password: ${'*'.repeat(PASSWORD.length)}`);
  console.log('');
  console.log('Sending login request...');
  console.log('');

  const req = client.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log('');

      if (data.length === 0) {
        console.log('✗ Empty response received!');
        console.log('');
        console.log('This usually means the backend server is not running or not responding.');
        console.log('');
        console.log('Please start the backend server:');
        console.log('  cd backend');
        console.log('  npm run dev');
        process.exit(1);
        return;
      }

      try {
        const response = JSON.parse(data);

        if (res.statusCode === 200) {
          console.log('✓ Login successful!');
          console.log('');
          console.log('Response:');
          console.log(`  Token: ${response.token.substring(0, 50)}...`);
          console.log(`  User ID: ${response.user.id}`);
          console.log(`  Username: ${response.user.username}`);
          console.log(`  Email: ${response.user.email}`);
          console.log(`  Role: ${response.user.role}`);
          console.log(`  Client ID: ${response.user.client_id || 'N/A'}`);
          console.log('');
          console.log('Full token (use this for API requests):');
          console.log(response.token);
          console.log('');
          console.log('To use this token in API requests, add this header:');
          console.log(`Authorization: Bearer ${response.token}`);
        } else {
          console.log('✗ Login failed!');
          console.log('');
          console.log('Error:', response.error || response.message || 'Unknown error');
          console.log('');
          if (res.statusCode === 401) {
            console.log('Possible reasons:');
            console.log('  - Username or password is incorrect');
            console.log('  - Admin user has not been created yet');
            console.log('');
            console.log('To create admin user, run:');
            console.log('  create-admin-user.bat');
          }
          process.exit(1);
        }
      } catch (error) {
        console.log('✗ Failed to parse response!');
        console.log('Raw response:', data);
        console.log('');
        console.log('This might indicate the server returned an error page or HTML instead of JSON.');
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.log('✗ Request failed!');
    console.log('');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - Backend server is not running!');
      console.error('');
      console.error('Please start the backend server:');
      console.error('  cd backend');
      console.error('  npm run dev');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      console.error('Connection timeout - Server may be unreachable or not responding');
      console.error('');
      console.error('Please check:');
      console.error('  1. Backend server is running');
      console.error('  2. The API URL is correct');
      console.error('  3. No firewall is blocking the connection');
    } else if (error.code === 'ENOTFOUND') {
      console.error(`Host not found: ${url.hostname}`);
      console.error('Please check the API URL is correct');
    } else {
      console.error('Error:', error.message || error.code || 'Unknown error');
    }
    
    console.log('');
    console.log('Please check:');
    console.log('  1. Backend server is running on', API_URL);
    console.log('  2. The API URL is correct');
    console.log('  3. No firewall is blocking the connection');
    console.log('');
    console.log('To start the backend server:');
    console.log('  cd backend');
    console.log('  npm run dev');
    process.exit(1);
  });

  req.on('timeout', () => {
    req.destroy();
    console.log('✗ Request timeout!');
    console.log('');
    console.log('The backend server did not respond in time.');
    console.log('');
    console.log('Please check:');
    console.log('  1. Backend server is running on', API_URL);
    console.log('  2. The server is not overloaded');
    process.exit(1);
  });

  req.setTimeout(5000);
  req.write(postData);
  req.end();
};

testLogin();
