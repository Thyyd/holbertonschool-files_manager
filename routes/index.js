import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

// Initialisation d'un Routeur Express
const router = express.Router();

// Création des routes GET
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

router.post('/users', UsersController.postNew);

export default router;
