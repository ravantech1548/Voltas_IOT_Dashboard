const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllSettings,
  getSetting,
  updateSetting,
  updateMultipleSettings
} = require('../controllers/settingsController');

router.use(authMiddleware);

router.get('/', getAllSettings);
router.get('/:key', getSetting);
router.put('/:key', updateSetting);
router.put('/', updateMultipleSettings); // For bulk updates

module.exports = router;

