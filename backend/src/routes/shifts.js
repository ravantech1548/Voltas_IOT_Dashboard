const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift
} = require('../controllers/shiftController');

router.get('/', authMiddleware, getAllShifts);
router.get('/:id', authMiddleware, getShiftById);
router.post('/', authMiddleware, createShift);
router.put('/:id', authMiddleware, updateShift);
router.delete('/:id', authMiddleware, deleteShift);

module.exports = router;


