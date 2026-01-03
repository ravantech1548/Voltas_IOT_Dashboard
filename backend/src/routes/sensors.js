const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor
} = require('../controllers/sensorController');

router.use(authMiddleware);

router.get('/', getAllSensors);
router.get('/:id', getSensorById);
router.post('/', createSensor);
router.put('/:id', updateSensor);
router.delete('/:id', deleteSensor);

module.exports = router;


