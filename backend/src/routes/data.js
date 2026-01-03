const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getSensorData,
  getLatestSensorData,
  getAggregatedData
} = require('../controllers/dataController');

router.use(authMiddleware);

router.get('/sensor/:sensor_id', getSensorData);
router.get('/latest', getLatestSensorData);
router.get('/aggregated', getAggregatedData);

module.exports = router;


