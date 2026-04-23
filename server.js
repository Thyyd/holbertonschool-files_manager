import express from 'express';
import routes from './routes/index';

// Création de l'instance express et du port
const app = express();
const port = process.env.PORT || 5000;


app.use('/', routes);

// Initialisation du serveur
const server = app.listen(port, () => {
  console.log(`API available on localhost port ${port}`);
});
