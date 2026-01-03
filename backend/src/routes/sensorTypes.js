const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllSensorTypes,
  getSensorTypeById,
  createSensorType,
  updateSensorType,
  deleteSensorType
} = require('../controllers/sensorTypeController');

router.use(authMiddleware);

router.get('/', getAllSensorTypes);
router.get('/:id', getSensorTypeById);
router.post('/', createSensorType);
router.put('/:id', updateSensorType);
router.delete('/:id', deleteSensorType);

module.exports = router;


