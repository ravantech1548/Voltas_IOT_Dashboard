const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
} = require('../controllers/clientController');

router.use(authMiddleware);

router.get('/', getAllClients);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

module.exports = router;


