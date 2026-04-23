import express from 'express';
import AppController from '../controllers/AppController';

// Initialisation d'un Routeur Express
const router = express.Router();

// Création des routes GET
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

export default router;
