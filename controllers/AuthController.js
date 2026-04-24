import db from '../utils/db';
import redis from '../utils/redis';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const AuthController = {
  getConnect: async (req, res) => {
    // Récupération du header Authorization
    const authorizationHeader = req.headers['authorization'];
    if (!authorizationHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extraction de la Base64 du header Authorization
    const base64Authorization = authorizationHeader.split(' ')[1];

    // Récupération de l'email et du pwd décodés
    const decodedAuthorization = Buffer.from(base64Authorization, 'base64').toString('utf-8').split(':');
    const [email, password] = decodedAuthorization;

    // Hashage du pwd pour comparer les données stockées dans la DB
    const hashedPwd = crypto.createHash('sha1').update(password).digest('hex');
    const userExists = await db.client.db(db.database).collection('users').findOne({ email, password: hashedPwd });
    if (!userExists) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Génération du token et de la key
    const token = uuidv4();
    const key = `auth_${token}`;

    await redis.set(key, userExists._id.toString(), 86400);
    return res.status(200).json({ token });
  },

  getDisconnect: async (req, res) => {
    // Récupération du header X-Token
    const xTokenHeader = req.headers['x-token'];
    const key = `auth_${xTokenHeader}`;

    const userId = await redis.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redis.del(key);
    return res.status(204).send();
  },
}

export default AuthController;
