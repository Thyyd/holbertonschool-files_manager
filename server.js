import express from 'express';
import routes from './routes/index';

// Création de l'instance express et du port
const app = express();
const port = process.env.PORT || 5000;

// Chargement des routes du fichier /routes/index
app.use(express.json());
app.use('/', routes);

// Initialisation du serveur
app.listen(port, () => {
  console.log(`API available on localhost port ${port}`);
});
