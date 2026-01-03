IoT Dashboard Platform \- Project Requirements Document

1\. Project Overview

# Purpose

# This IoT Dashboard Platform enables real-time monitoring and visualization of sensor data streams from MQTT-enabled devices. The system supports multi-tenant configurations across client sites, departments, locations, and sensor types with rich interactive dashboards and database-driven reports.

# 

# Key Objectives

# • Real-time data ingestion from MQTT protocol

# • Live streaming dashboards with rich visual charts and gauges

# • Multi-tenant settings for clients, departments, locations, and sensors

# • Historical data storage and reporting in PostgreSQL

# • Scalable architecture supporting multiple sensor types and counts

# • Responsive web interface for desktop and mobile devices

# 

# Target Users

# • Facility Managers monitoring environmental sensors

# • Operations Teams tracking equipment performance

# • System Administrators configuring sites and sensors

# • Data Analysts generating reports from historical data

# 

# 

# 2\. Technology Stack (JavaScript-Based)

# 

# Frontend

# • React.js 18+ (JavaScript, no TypeScript)

# • Chart Libraries:

#   \- Recharts (composable SVG charts for real-time data)

#   \- react-chartjs-2 (Chart.js wrapper for animated canvas charts)

#   \- echarts-for-react (ECharts for high-performance large datasets)

# • UI Framework: Tailwind CSS \+ Shadcn UI components (JavaScript version)

# • State Management: React Context API or Zustand

# • Data Fetching: Axios \+ React Query (TanStack Query)

# • WebSocket Client: socket.io-client for real-time data streams

# 

# Backend

# • Node.js 18+ with Express.js

# • MQTT Client: mqtt npm package (mqtt.js)

# • WebSocket Server: Socket.io for real-time push to frontend

# • Authentication: JWT (jsonwebtoken) \+ bcryptjs for password hashing

# • Database Client: pg (node-postgres) or Prisma ORM (JavaScript mode)

# • API Documentation: Swagger/OpenAPI

# 

# Database

# • PostgreSQL 14+

# • TimescaleDB extension for time-series data optimization

# • Schema design: Multi-tenant with tenant\_id isolation

# 

# Infrastructure

# • Docker \+ Docker Compose for local development

# • MQTT Broker: Mosquitto or HiveMQ

# • Reverse Proxy: Nginx

# • Optional: PM2 for Node.js process management

# 

# 

# 3\. System Architecture

# 

# Data Flow Diagram

# 

# IoT Devices (MQTT Publishers)

#    ↓

#    Publish to Topics: client/{clientId}/dept/{deptId}/location/{locId}/sensor/{sensorId}

#    ↓

# MQTT Broker (Mosquitto)

#    ↓

# Node.js Backend (MQTT Subscriber)

#    ↓

#    Parse JSON payload → Validate → Insert into PostgreSQL

#    ↓

# PostgreSQL Database (sensor\_data table with TimescaleDB)

#    ↓

#    ← Query historical data ←

#    ↓

# Node.js API Server (Express \+ Socket.io)

#    ↓

#    REST API: /api/clients, /api/sensors, /api/reports

#    WebSocket: Real-time data push to connected clients

#    ↓

# React.js Frontend

#    ↓

#    Display live charts (Recharts/Chart.js) \+ Settings forms \+ Reports

# 

# 

# Key Components

# 1\. MQTT Handler (Backend)

#    \- Subscribes to wildcard topics: client/+/dept/+/location/+/sensor/+

#    \- Parses incoming JSON: {sensor\_id, value, timestamp, metadata}

#    \- Inserts into sensor\_data table

#    \- Broadcasts to WebSocket clients

# 

# 2\. WebSocket Server (Backend)

#    \- Maintains persistent connections with React clients

#    \- Pushes new sensor readings in real-time

#    \- Rooms/namespaces per client\_id for multi-tenancy

# 

# 3\. REST API (Backend)

#    \- CRUD operations for clients, departments, locations, sensors

#    \- Authentication via JWT tokens

#    \- Query endpoints for historical data and reports

# 

# 4\. Dashboard UI (Frontend)

#    \- Real-time charts updating via WebSocket events

#    \- Configurable time ranges (last 1hr, 24hr, 7days)

#    \- Multi-sensor comparison views

# 

# 

# 4\. Database Schema (PostgreSQL)

# 

# Multi-Tenant Configuration Tables

# 

# \-- Clients (Top-level tenant)

# CREATE TABLE clients (

#   id SERIAL PRIMARY KEY,

#   name VARCHAR(255) NOT NULL,

#   site\_address TEXT,

#   contact\_email VARCHAR(255),

#   created\_at TIMESTAMPTZ DEFAULT NOW(),

#   updated\_at TIMESTAMPTZ DEFAULT NOW()

# );

# 

# \-- Departments (within a client)

# CREATE TABLE departments (

#   id SERIAL PRIMARY KEY,

#   client\_id INT REFERENCES clients(id) ON DELETE CASCADE,

#   name VARCHAR(255) NOT NULL,

#   description TEXT,

#   created\_at TIMESTAMPTZ DEFAULT NOW()

# );

# 

# \-- Locations (within a department)

# CREATE TABLE locations (

#   id SERIAL PRIMARY KEY,

#   department\_id INT REFERENCES departments(id) ON DELETE CASCADE,

#   name VARCHAR(255) NOT NULL,

#   floor\_level VARCHAR(50),

#   geo\_coordinates POINT,  \-- Optional: for mapping

#   created\_at TIMESTAMPTZ DEFAULT NOW()

# );

# 

# \-- Sensor Types (e.g., temperature, humidity, pressure)

# CREATE TABLE sensor\_types (

#   id SERIAL PRIMARY KEY,

#   name VARCHAR(100) NOT NULL UNIQUE,  \-- 'temperature', 'humidity', 'pressure', etc.

#   unit VARCHAR(20),  \-- '°C', '%', 'hPa', etc.

#   description TEXT,

#   min\_value NUMERIC,  \-- For validation and visualization ranges

#   max\_value NUMERIC,

#   created\_at TIMESTAMPTZ DEFAULT NOW()

# );

# 

# \-- Sensors (physical devices at locations)

# CREATE TABLE sensors (

#   id SERIAL PRIMARY KEY,

#   location\_id INT REFERENCES locations(id) ON DELETE CASCADE,

#   sensor\_type\_id INT REFERENCES sensor\_types(id),

#   name VARCHAR(255) NOT NULL,

#   mqtt\_topic VARCHAR(500) NOT NULL,  \-- Full MQTT topic path

#   sensor\_count INT DEFAULT 1,  \-- Number of physical sensors of this type

#   status VARCHAR(50) DEFAULT 'active',  \-- 'active', 'inactive', 'maintenance'

#   metadata JSONB,  \-- Additional config: {"threshold": 25, "alert\_enabled": true}

#   created\_at TIMESTAMPTZ DEFAULT NOW(),

#   updated\_at TIMESTAMPTZ DEFAULT NOW()

# );

# 

# CREATE INDEX idx\_sensors\_mqtt\_topic ON sensors(mqtt\_topic);

# 

# 

# Time-Series Data Table (with TimescaleDB)

# 

# \-- Sensor data readings (optimized for time-series)

# CREATE TABLE sensor\_data (

#   id BIGSERIAL,

#   sensor\_id INT NOT NULL REFERENCES sensors(id),

#   timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

#   value NUMERIC NOT NULL,

#   quality VARCHAR(20) DEFAULT 'good',  \-- 'good', 'poor', 'error'

#   metadata JSONB,  \-- Additional context: {"battery": 85, "signal\_strength": \-60}

#   PRIMARY KEY (sensor\_id, timestamp)

# );

# 

# \-- Convert to TimescaleDB hypertable for performance

# SELECT create\_hypertable('sensor\_data', 'timestamp');

# 

# \-- Create indexes for common queries

# CREATE INDEX idx\_sensor\_data\_sensor\_time ON sensor\_data(sensor\_id, timestamp DESC);

# CREATE INDEX idx\_sensor\_data\_timestamp ON sensor\_data(timestamp DESC);

# 

# \-- Optional: Continuous aggregates for pre-computed stats

# CREATE MATERIALIZED VIEW sensor\_data\_hourly

# WITH (timescaledb.continuous) AS

# SELECT

#   sensor\_id,

#   time\_bucket('1 hour', timestamp) AS bucket,

#   AVG(value) AS avg\_value,

#   MIN(value) AS min\_value,

#   MAX(value) AS max\_value,

#   COUNT(\*) AS reading\_count

# FROM sensor\_data

# GROUP BY sensor\_id, bucket;

# 

# 

# User Management Table

# 

# CREATE TABLE users (

#   id SERIAL PRIMARY KEY,

#   username VARCHAR(100) NOT NULL UNIQUE,

#   email VARCHAR(255) NOT NULL UNIQUE,

#   password\_hash VARCHAR(255) NOT NULL,

#   role VARCHAR(50) DEFAULT 'viewer',  \-- 'admin', 'manager', 'viewer'

#   client\_id INT REFERENCES clients(id),  \-- NULL for super-admin

#   created\_at TIMESTAMPTZ DEFAULT NOW(),

#   last\_login TIMESTAMPTZ

# );

# 

# CREATE INDEX idx\_users\_email ON users(email);

# 

# 

# Hierarchical Query Examples

# 

# \-- Get all sensors for a specific client

# SELECT 

#   c.name AS client\_name,

#   d.name AS department\_name,

#   l.name AS location\_name,

#   st.name AS sensor\_type,

#   s.name AS sensor\_name,

#   s.mqtt\_topic

# FROM sensors s

# JOIN locations l ON s.location\_id \= l.id

# JOIN departments d ON l.department\_id \= d.id

# JOIN clients c ON d.client\_id \= c.id

# JOIN sensor\_types st ON s.sensor\_type\_id \= st.id

# WHERE c.id \= $1;

# 

# \-- Get latest readings for all sensors in a location

# SELECT 

#   s.name AS sensor\_name,

#   st.name AS sensor\_type,

#   st.unit,

#   sd.value,

#   sd.timestamp

# FROM sensor\_data sd

# JOIN sensors s ON sd.sensor\_id \= s.id

# JOIN sensor\_types st ON s.sensor\_type\_id \= st.id

# WHERE s.location\_id \= $1

# AND sd.timestamp \= (

#   SELECT MAX(timestamp) 

#   FROM sensor\_data 

#   WHERE sensor\_id \= sd.sensor\_id

# );

# 

# 

# 5\. Feature Requirements

# 

# 5.1 Settings & Configuration Module

# 

# Client Management

# • Add/Edit/Delete client sites with contact information

# • View list of all clients with search and filtering

# • Associate multiple departments with each client

# 

# Department Management

# • Create departments under selected client

# • Hierarchical dropdown: Client → Department selection

# • Edit department details and descriptions

# 

# Location Management

# • Add locations within departments

# • Hierarchical selection: Client → Department → Location

# • Optional: Floor level, geo-coordinates for mapping

# • View all locations in tree/table view

# 

# Sensor Type Configuration

# • Define sensor types: Temperature, Humidity, Pressure, CO2, etc.

# • Set units of measurement (°C, %, hPa, ppm)

# • Configure min/max value ranges for validation

# • Add custom sensor types dynamically

# 

# Sensor Registration

# • Register sensors at specific locations

# • Multi-select: Client → Dept → Location → Sensor Type

# • Configure sensor count (e.g., 5 temperature sensors in one location)

# • Set MQTT topic pattern: client/{id}/dept/{id}/location/{id}/sensor/{id}

# • Add metadata: thresholds, alert settings, calibration data

# • Set sensor status: Active, Inactive, Maintenance

# 

# UI Components for Settings

# • Hierarchical dropdowns with search (React-Select or Headless UI)

# • Form validation using React Hook Form or Formik

# • Modal dialogs for Add/Edit operations

# • Confirmation dialogs for Delete operations

# • Toast notifications for success/error feedback

# 

# 

# 5.2 Real-Time Dashboard Module

# 

# Live Data Visualization

# • Auto-updating charts using WebSocket data streams

# • Chart types:

#   \- Line Charts: Time-series trends (Recharts LineChart)

#   \- Gauge Charts: Current sensor values (react-chartjs-2 Doughnut or ECharts Gauge)

#   \- Bar Charts: Comparison across multiple sensors

#   \- Heatmaps: Spatial distribution (ECharts Heatmap)

#   \- Area Charts: Shaded time-series (Recharts AreaChart)

# 

# Dashboard Features

# • Client/Dept/Location selector filters

# • Time range selector: Last 1hr, 6hr, 24hr, 7 days, Custom

# • Multi-sensor comparison view (overlay multiple sensors)

# • Grid layout with drag-and-drop widgets (react-grid-layout)

# • Auto-refresh toggle (enable/disable live updates)

# • Full-screen mode for individual charts

# 

# Alert Indicators

# • Visual alerts when sensor values exceed thresholds

# • Color coding: Green (normal), Yellow (warning), Red (critical)

# • Alert badges on dashboard cards

# 

# Data Display

# • Latest value with timestamp for each sensor

# • Min/Max/Avg statistics for selected time range

# • Status indicators: Online, Offline, Error

# • Battery level and signal strength (from metadata)

# 

# 

# 5.3 Reports & Analytics Module

# 

# Report Types

# • Historical Trends: Line/area charts for time-series analysis

# • Comparative Reports: Multi-sensor/location comparisons

# • Statistical Summaries: Avg, Min, Max, Std Dev for date ranges

# • Downtime Reports: Sensor offline periods and data gaps

# • Alert History: Log of all threshold violations

# 

# Report Features

# • Date range picker with presets (Last week, Last month, Custom)

# • Export options: PDF, CSV, Excel (XLSX)

# • Scheduled reports: Daily/Weekly email delivery

# • Filter by: Client, Department, Location, Sensor Type

# • Aggregation levels: Raw data, Hourly, Daily, Weekly

# 

# Data Tables

# • Sortable columns (timestamp, value, sensor)

# • Pagination for large datasets

# • Search and filter capabilities

# • Column visibility toggle

# 

# 

# 5.4 User Authentication & Authorization

# 

# Authentication

# • JWT-based login system

# • Email/password credentials

# • Password reset via email token

# • Session timeout after inactivity

# 

# User Roles & Permissions

# • Super Admin: Full system access, manage all clients

# • Client Admin: Manage own client's config and users

# • Manager: View dashboards, generate reports, no config changes

# • Viewer: Read-only dashboard access

# 

# Security

# • Password hashing with bcrypt

# • HTTPS enforcement

# • CORS configuration for API

# • Rate limiting on API endpoints

# • SQL injection prevention (parameterized queries)

# 

# 

# 6\. Implementation Guidelines (JavaScript)

# 

# 6.1 Project Structure

# 

# project-root/

# ├── backend/

# │   ├── src/

# │   │   ├── config/

# │   │   │   ├── database.js      // PostgreSQL connection

# │   │   │   ├── mqtt.js          // MQTT broker config

# │   │   │   └── auth.js          // JWT secret

# │   │   ├── controllers/

# │   │   │   ├── clientController.js

# │   │   │   ├── sensorController.js

# │   │   │   └── dataController.js

# │   │   ├── routes/

# │   │   │   ├── clients.js

# │   │   │   ├── sensors.js

# │   │   │   ├── data.js

# │   │   │   └── auth.js

# │   │   ├── middleware/

# │   │   │   ├── authMiddleware.js

# │   │   │   └── errorHandler.js

# │   │   ├── services/

# │   │   │   ├── mqttHandler.js    // MQTT subscriber

# │   │   │   └── socketHandler.js  // WebSocket server

# │   │   └── server.js          // Express app entry

# │   ├── package.json

# │   └── .env

# ├── frontend/

# │   ├── public/

# │   ├── src/

# │   │   ├── components/

# │   │   │   ├── dashboard/

# │   │   │   │   ├── LiveChart.jsx

# │   │   │   │   ├── GaugeChart.jsx

# │   │   │   │   └── SensorCard.jsx

# │   │   │   ├── settings/

# │   │   │   │   ├── ClientForm.jsx

# │   │   │   │   ├── SensorForm.jsx

# │   │   │   │   └── HierarchySelector.jsx

# │   │   │   ├── reports/

# │   │   │   │   ├── ReportTable.jsx

# │   │   │   │   └── ExportButton.jsx

# │   │   │   └── common/

# │   │   │       ├── Navbar.jsx

# │   │   │       └── Modal.jsx

# │   │   ├── pages/

# │   │   │   ├── Dashboard.jsx

# │   │   │   ├── Settings.jsx

# │   │   │   ├── Reports.jsx

# │   │   │   └── Login.jsx

# │   │   ├── hooks/

# │   │   │   ├── useWebSocket.js

# │   │   │   └── useAuth.js

# │   │   ├── context/

# │   │   │   └── AuthContext.jsx

# │   │   ├── utils/

# │   │   │   ├── api.js           // Axios instance

# │   │   │   └── chartConfig.js   // Chart.js defaults

# │   │   ├── App.jsx

# │   │   └── index.js

# │   ├── package.json

# │   └── tailwind.config.js

# ├── docker-compose.yml

# └── README.md

# 

# 

# 6.2 Backend Code Examples (JavaScript)

# 

# MQTT Handler (services/mqttHandler.js)

# 

# const mqtt \= require('mqtt');

# const { Pool } \= require('pg');

# const io \= require('./socketHandler');

# 

# const pool \= new Pool({

#   connectionString: process.env.DATABASE\_URL

# });

# 

# const client \= mqtt.connect(process.env.MQTT\_BROKER\_URL, {

#   username: process.env.MQTT\_USERNAME,

#   password: process.env.MQTT\_PASSWORD

# });

# 

# client.on('connect', () \=\> {

#   console.log('Connected to MQTT broker');

#   client.subscribe('client/+/dept/+/location/+/sensor/+', (err) \=\> {

#     if (\!err) console.log('Subscribed to sensor topics');

#   });

# });

# 

# client.on('message', async (topic, message) \=\> {

#   try {

#     const payload \= JSON.parse(message.toString());

#     const { sensor\_id, value, timestamp, metadata } \= payload;

# 

#     // Insert into PostgreSQL

#     await pool.query(

#       'INSERT INTO sensor\_data (sensor\_id, value, timestamp, metadata) VALUES ($1, $2, $3, $4)',

#       \[sensor\_id, value, timestamp || new Date(), metadata\]

#     );

# 

#     // Broadcast to WebSocket clients

#     io.to(\`sensor\_${sensor\_id}\`).emit('sensor\_update', payload);

# 

#   } catch (error) {

#     console.error('MQTT message processing error:', error);

#   }

# });

# 

# module.exports \= client;

# 

# 

# API Routes Example (routes/sensors.js)

# 

# const express \= require('express');

# const router \= express.Router();

# const { Pool } \= require('pg');

# const authMiddleware \= require('../middleware/authMiddleware');

# 

# const pool \= new Pool({ connectionString: process.env.DATABASE\_URL });

# 

# // Get all sensors with hierarchy

# router.get('/', authMiddleware, async (req, res) \=\> {

#   try {

#     const result \= await pool.query(\`

#       SELECT 

#         s.id, s.name, s.mqtt\_topic, s.sensor\_count, s.status,

#         st.name as sensor\_type, st.unit,

#         l.name as location\_name,

#         d.name as department\_name,

#         c.name as client\_name

#       FROM sensors s

#       JOIN sensor\_types st ON s.sensor\_type\_id \= st.id

#       JOIN locations l ON s.location\_id \= l.id

#       JOIN departments d ON l.department\_id \= d.id

#       JOIN clients c ON d.client\_id \= c.id

#       WHERE c.id \= $1

#     \`, \[req.user.client\_id\]);

#     res.json(result.rows);

#   } catch (error) {

#     res.status(500).json({ error: error.message });

#   }

# });

# 

# // Create new sensor

# router.post('/', authMiddleware, async (req, res) \=\> {

#   const { location\_id, sensor\_type\_id, name, mqtt\_topic, sensor\_count, metadata } \= req.body;

#   try {

#     const result \= await pool.query(

#       'INSERT INTO sensors (location\_id, sensor\_type\_id, name, mqtt\_topic, sensor\_count, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING \*',

#       \[location\_id, sensor\_type\_id, name, mqtt\_topic, sensor\_count, metadata\]

#     );

#     res.status(201).json(result.rows\[0\]);

#   } catch (error) {

#     res.status(400).json({ error: error.message });

#   }

# });

# 

# module.exports \= router;

# 

# 

# 6.3 Frontend Code Examples (JavaScript/React)

# 

# Live Chart Component (components/dashboard/LiveChart.jsx)

# 

# import React, { useState, useEffect } from 'react';

# import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

# import useWebSocket from '../../hooks/useWebSocket';

# 

# const LiveChart \= ({ sensorId, sensorName, unit }) \=\> {

#   const \[data, setData\] \= useState(\[\]);

#   const { lastMessage } \= useWebSocket(\`sensor\_${sensorId}\`);

# 

#   useEffect(() \=\> {

#     if (lastMessage) {

#       const newPoint \= {

#         time: new Date(lastMessage.timestamp).toLocaleTimeString(),

#         value: parseFloat(lastMessage.value)

#       };

#       

#       setData(prevData \=\> {

#         const updated \= \[...prevData, newPoint\];

#         // Keep last 20 data points

#         return updated.slice(-20);

#       });

#     }

#   }, \[lastMessage\]);

# 

#   return (

#     \<div className="bg-white p-4 rounded-lg shadow"\>

#       \<h3 className="text-lg font-semibold mb-4"\>{sensorName}\</h3\>

#       \<ResponsiveContainer width="100%" height={300}\>

#         \<LineChart data={data}\>

#           \<CartesianGrid strokeDasharray="3 3" /\>

#           \<XAxis dataKey="time" /\>

#           \<YAxis label={{ value: unit, angle: \-90, position: 'insideLeft' }} /\>

#           \<Tooltip /\>

#           \<Legend /\>

#           \<Line type="monotone" dataKey="value" stroke="\#8884d8" activeDot={{ r: 8 }} /\>

#         \</LineChart\>

#       \</ResponsiveContainer\>

#     \</div\>

#   );

# };

# 

# export default LiveChart;

# 

# 

# WebSocket Hook (hooks/useWebSocket.js)

# 

# import { useEffect, useState } from 'react';

# import io from 'socket.io-client';

# 

# const useWebSocket \= (room) \=\> {

#   const \[socket, setSocket\] \= useState(null);

#   const \[lastMessage, setLastMessage\] \= useState(null);

#   const \[connected, setConnected\] \= useState(false);

# 

#   useEffect(() \=\> {

#     const socketInstance \= io(process.env.REACT\_APP\_WS\_URL, {

#       auth: { token: localStorage.getItem('token') }

#     });

# 

#     socketInstance.on('connect', () \=\> {

#       setConnected(true);

#       socketInstance.emit('join\_room', room);

#     });

# 

#     socketInstance.on('sensor\_update', (data) \=\> {

#       setLastMessage(data);

#     });

# 

#     socketInstance.on('disconnect', () \=\> {

#       setConnected(false);

#     });

# 

#     setSocket(socketInstance);

# 

#     return () \=\> socketInstance.disconnect();

#   }, \[room\]);

# 

#   return { socket, lastMessage, connected };

# };

# 

# export default useWebSocket;

# 

# 

# Hierarchy Selector (components/settings/HierarchySelector.jsx)

# 

# import React, { useState, useEffect } from 'react';

# import axios from 'axios';

# 

# const HierarchySelector \= ({ onSelectionChange }) \=\> {

#   const \[clients, setClients\] \= useState(\[\]);

#   const \[departments, setDepartments\] \= useState(\[\]);

#   const \[locations, setLocations\] \= useState(\[\]);

#   

#   const \[selectedClient, setSelectedClient\] \= useState('');

#   const \[selectedDept, setSelectedDept\] \= useState('');

#   const \[selectedLocation, setSelectedLocation\] \= useState('');

# 

#   useEffect(() \=\> {

#     // Fetch clients on mount

#     axios.get('/api/clients').then(res \=\> setClients(res.data));

#   }, \[\]);

# 

#   useEffect(() \=\> {

#     if (selectedClient) {

#       axios.get(\`/api/departments?client\_id=${selectedClient}\`)

#         .then(res \=\> setDepartments(res.data));

#       setSelectedDept('');

#       setSelectedLocation('');

#     }

#   }, \[selectedClient\]);

# 

#   useEffect(() \=\> {

#     if (selectedDept) {

#       axios.get(\`/api/locations?department\_id=${selectedDept}\`)

#         .then(res \=\> setLocations(res.data));

#       setSelectedLocation('');

#     }

#   }, \[selectedDept\]);

# 

#   useEffect(() \=\> {

#     onSelectionChange({

#       client\_id: selectedClient,

#       department\_id: selectedDept,

#       location\_id: selectedLocation

#     });

#   }, \[selectedClient, selectedDept, selectedLocation\]);

# 

#   return (

#     \<div className="space-y-4"\>

#       \<div\>

#         \<label className="block text-sm font-medium mb-2"\>Client\</label\>

#         \<select 

#           value={selectedClient} 

#           onChange={(e) \=\> setSelectedClient(e.target.value)}

#           className="w-full p-2 border rounded"

#         \>

#           \<option value=""\>Select Client\</option\>

#           {clients.map(c \=\> \<option key={c.id} value={c.id}\>{c.name}\</option\>)}

#         \</select\>

#       \</div\>

# 

#       {selectedClient && (

#         \<div\>

#           \<label className="block text-sm font-medium mb-2"\>Department\</label\>

#           \<select 

#             value={selectedDept} 

#             onChange={(e) \=\> setSelectedDept(e.target.value)}

#             className="w-full p-2 border rounded"

#           \>

#             \<option value=""\>Select Department\</option\>

#             {departments.map(d \=\> \<option key={d.id} value={d.id}\>{d.name}\</option\>)}

#           \</select\>

#         \</div\>

#       )}

# 

#       {selectedDept && (

#         \<div\>

#           \<label className="block text-sm font-medium mb-2"\>Location\</label\>

#           \<select 

#             value={selectedLocation} 

#             onChange={(e) \=\> setSelectedLocation(e.target.value)}

#             className="w-full p-2 border rounded"

#           \>

#             \<option value=""\>Select Location\</option\>

#             {locations.map(l \=\> \<option key={l.id} value={l.id}\>{l.name}\</option\>)}

#           \</select\>

#         \</div\>

#       )}

#     \</div\>

#   );

# };

# 

# export default HierarchySelector;

# 

# 

# 7\. Deployment & Setup

# 

# Docker Compose Configuration

# 

# version: '3.8'

# 

# services:

#   postgres:

#     image: timescale/timescaledb:latest-pg14

#     environment:

#       POSTGRES\_DB: iot\_dashboard

#       POSTGRES\_USER: iotuser

#       POSTGRES\_PASSWORD: iotpassword

#     ports:

#       \- "5432:5432"

#     volumes:

#       \- postgres\_data:/var/lib/postgresql/data

# 

#   mosquitto:

#     image: eclipse-mosquitto:latest

#     ports:

#       \- "1883:1883"

#       \- "9001:9001"

#     volumes:

#       \- ./mosquitto/config:/mosquitto/config

#       \- mosquitto\_data:/mosquitto/data

# 

#   backend:

#     build: ./backend

#     ports:

#       \- "5000:5000"

#     environment:

#       DATABASE\_URL: postgresql://iotuser:iotpassword@postgres:5432/iot\_dashboard

#       MQTT\_BROKER\_URL: mqtt://mosquitto:1883

#       JWT\_SECRET: your-secret-key-here

#     depends\_on:

#       \- postgres

#       \- mosquitto

# 

#   frontend:

#     build: ./frontend

#     ports:

#       \- "3000:3000"

#     environment:

#       REACT\_APP\_API\_URL: http://localhost:5000

#       REACT\_APP\_WS\_URL: http://localhost:5000

#     depends\_on:

#       \- backend

# 

# volumes:

#   postgres\_data:

#   mosquitto\_data:

# 

# 

# Environment Variables (.env)

# 

# Backend (.env):

# PORT=5000

# DATABASE\_URL=postgresql://iotuser:iotpassword@localhost:5432/iot\_dashboard

# MQTT\_BROKER\_URL=mqtt://localhost:1883

# MQTT\_USERNAME=

# MQTT\_PASSWORD=

# JWT\_SECRET=your-super-secret-jwt-key-change-in-production

# JWT\_EXPIRES\_IN=7d

# NODE\_ENV=development

# 

# Frontend (.env):

# REACT\_APP\_API\_URL=http://localhost:5000/api

# REACT\_APP\_WS\_URL=http://localhost:5000

# 

# 

# Installation Steps

# 

# 1\. Initialize Projects

#    \# Backend

#    cd backend

#    npm init \-y

#    npm install express mqtt pg socket.io cors dotenv bcryptjs jsonwebtoken

#    npm install \--save-dev nodemon

# 

#    \# Frontend

#    cd frontend

#    npx create-react-app . \--template cra-template

#    npm install recharts react-chartjs-2 chart.js echarts-for-react

#    npm install axios socket.io-client react-router-dom

#    npm install \-D tailwindcss postcss autoprefixer

#    npx tailwindcss init \-p

# 

# 2\. Database Setup

#    \# Connect to PostgreSQL

#    psql \-U iotuser \-d iot\_dashboard

# 

#    \# Run schema creation scripts (from section 4\)

#    \# Enable TimescaleDB

#    CREATE EXTENSION IF NOT EXISTS timescaledb;

# 

# 3\. Start Services

#    \# Using Docker Compose

#    docker-compose up \-d

# 

#    \# Or manually

#    \# Terminal 1: Start PostgreSQL and Mosquitto

#    \# Terminal 2: Start backend

#    cd backend && npm run dev

#    

#    \# Terminal 3: Start frontend

#    cd frontend && npm start

# 

# 4\. Seed Initial Data

#    \# Create seed script (backend/seed.js) to populate:

#    \# \- Sample clients, departments, locations

#    \# \- Sensor types (temperature, humidity, etc.)

#    \# \- Test sensors

# 

# 

# 8\. Testing & Development

# 

# MQTT Testing

# • Use MQTT.fx or MQTTX client to publish test messages

# • Topic format: client/1/dept/1/location/1/sensor/1

# • Payload: {"sensor\_id": 1, "value": 23.5, "timestamp": "2025-01-01T10:00:00Z"}

# 

# API Testing

# • Use Postman or Thunder Client for REST API testing

# • Import OpenAPI/Swagger spec for endpoints

# 

# Frontend Development

# • Use React DevTools for component inspection

# • Enable hot reload for faster development

# • Test responsive design with browser DevTools

# 

# 

# 9\. Next Steps & Enhancements

# 

# Phase 1 (MVP)

# • Basic CRUD for clients/departments/locations/sensors

# • Live dashboard with line charts

# • Simple reports with date range filtering

# 

# Phase 2 (Advanced Features)

# • Alert notifications (email/SMS/push)

# • Custom dashboard layouts with drag-and-drop

# • Advanced analytics: anomaly detection, predictive trends

# • Mobile app (React Native)

# 

# Phase 3 (Enterprise)

# • Multi-language support (i18n)

# • Advanced user permissions (RBAC)

# • Data export automation (scheduled jobs)

# • Integration with third-party services (Slack, Teams)

# • Edge computing support for local data processing

# 

# 

# 10\. Performance Considerations

# 

# Database Optimization

# • Use TimescaleDB continuous aggregates for pre-computed stats

# • Implement data retention policies (auto-delete old data)

# • Create proper indexes on frequently queried columns

# • Use connection pooling (pg-pool)

# 

# Frontend Optimization

# • Implement virtual scrolling for large data tables (react-window)

# • Lazy load chart components

# • Debounce WebSocket updates to reduce re-renders

# • Use React.memo for expensive components

# 

# Backend Optimization

# • Implement rate limiting for API endpoints

# • Use Redis for caching frequently accessed data

# • Batch insert sensor data for better write performance

# • Load balance WebSocket connections

# 

# \---

# End of Document

# 