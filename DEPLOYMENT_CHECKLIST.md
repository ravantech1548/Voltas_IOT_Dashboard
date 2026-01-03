# Deployment Checklist

Quick reference checklist for deploying the IoT Dashboard Platform.

## Pre-Deployment

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL 14+ installed and running
- [ ] TimescaleDB extension installed (optional but recommended)
- [ ] MQTT broker configured (HiveMQ Cloud or local Mosquitto)
- [ ] Firewall ports open (5000 for backend, 3000 for frontend dev, 80/443 for production)

## Database Setup

- [ ] PostgreSQL service running
- [ ] Database `iot_dashboard` created
- [ ] Database user created with proper permissions
- [ ] Schema created (`create-all-tables.sql` or `node src/scripts/initDatabase.js`)
- [ ] TimescaleDB extension enabled (if available)
- [ ] Migrations applied (`add-sensor-mqtt-fields.sql`)
- [ ] Admin user created (`npm run create-admin`)
- [ ] Initial data seeded (optional: `npm run seed-initial`)

## Backend Setup

- [ ] Dependencies installed (`cd backend && npm install`)
- [ ] `.env` file created from `env.template`
- [ ] `DATABASE_URL` configured correctly
- [ ] `JWT_SECRET` set to strong random value (min 32 chars)
- [ ] `MQTT_BROKER_URL` and credentials configured
- [ ] Database connection tested
- [ ] Backend starts without errors (`npm run dev`)
- [ ] Health endpoint responds (`curl http://localhost:5000/health`)

## Frontend Setup

- [ ] Dependencies installed (`cd frontend && npm install`)
- [ ] `.env` file created with `REACT_APP_API_URL` and `REACT_APP_WS_URL`
- [ ] Frontend starts without errors (`npm start`)
- [ ] Frontend connects to backend API
- [ ] Login page loads and accepts credentials

## MQTT Configuration

- [ ] MQTT broker accessible (test connection)
- [ ] MQTT credentials configured in backend `.env`
- [ ] MQTT topic configured (`MQTT_TOPIC` in `.env`)
- [ ] Sensors configured in Settings page with:
  - Device ID (`did` from payload)
  - Channel Code (s1, s2, s3, etc.)
  - MQTT Payload Topic (e.g., "voltas")
- [ ] MQTT payload format verified (JSON structure)
- [ ] Test MQTT message received in backend logs

## Production Deployment

### Backend Production

- [ ] `NODE_ENV=production` in `.env`
- [ ] Strong `JWT_SECRET` set
- [ ] Database connection string updated for production
- [ ] PM2 installed (`npm install -g pm2`)
- [ ] Backend running under PM2 (`pm2 start src/server.js`)
- [ ] PM2 startup script configured (`pm2 startup` and `pm2 save`)
- [ ] Nginx reverse proxy configured (if using)
- [ ] SSL certificates configured (HTTPS)
- [ ] Firewall rules configured

### Frontend Production

- [ ] Production build created (`npm run build`)
- [ ] Build output verified in `build/` directory
- [ ] Nginx configured to serve static files
- [ ] SSL certificates configured
- [ ] Environment variables set for production API URLs
- [ ] CORS configured in backend for production frontend URL

### Database Production

- [ ] PostgreSQL tuned for production (`postgresql.conf`)
- [ ] Connection pooling configured (pgBouncer, if using)
- [ ] Backup script created and scheduled (cron)
- [ ] Backup storage location configured
- [ ] Database access restricted (firewall, SSL)

## Security Checklist

- [ ] Default admin password changed
- [ ] Strong JWT_SECRET configured
- [ ] HTTPS enabled for all connections
- [ ] Database user has minimal required permissions
- [ ] `.env` files not committed to version control
- [ ] Rate limiting enabled (backend)
- [ ] CORS configured for specific origins only
- [ ] Firewall rules restrict access to necessary ports
- [ ] Regular security updates scheduled
- [ ] Log monitoring configured

## Testing

- [ ] Backend API endpoints respond correctly
- [ ] Frontend loads and displays correctly
- [ ] User authentication works (login/logout)
- [ ] Dashboard displays live sensor data
- [ ] MQTT messages received and processed
- [ ] WebSocket updates working (real-time dashboard)
- [ ] Reports page generates and exports correctly
- [ ] Settings page allows sensor configuration
- [ ] Shift filtering works correctly

## Post-Deployment

- [ ] Monitor logs for errors
- [ ] Verify MQTT messages being received
- [ ] Check database growth (sensor_data table)
- [ ] Verify backups are running
- [ ] Set up monitoring/alerts
- [ ] Document any custom configurations
- [ ] Share access credentials securely with team

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Port already in use | Change PORT in `.env` or kill process |
| Database connection failed | Check DATABASE_URL and PostgreSQL service |
| MQTT connection failed | Check broker URL, credentials, and broker status |
| Frontend can't connect to API | Check REACT_APP_API_URL and CORS settings |
| WebSocket connection failed | Check REACT_APP_WS_URL and Socket.io status |

## Quick Commands

```bash
# Database
psql -U postgres -d iot_dashboard
CREATE DATABASE iot_dashboard;

# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm start

# Production
pm2 start src/server.js --name iot-backend
pm2 save

# Build
cd frontend && npm run build

# Test
curl http://localhost:5000/health
curl http://localhost:5000/api/auth/login -d '{"username":"admin","password":"admin123"}'
```

---

**For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

