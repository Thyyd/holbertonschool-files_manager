import crypto from 'crypto';
import db from '../utils/db';

const UsersController = {
  postNew: async (req, res) => {
    // Récupération de l'email et du pwd
    const email = req.body.email;
    const pwd = req.body.password;

    // Vérification de l'email et du pwd
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!pwd) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Vérifie que l'email n'existe pas déjà dans la DB
    const emailExists = await db.client.db(db.database).collection('users').findOne({ email: email });
    if (emailExists) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hashage du pwd
    const hashedPwd = crypto.createHash('sha1').update(pwd).digest('hex');

    const newId = await db.client.db(db.database).collection('users').insertOne({ email: email, password: hashedPwd });
    return res.status(201).json({ id: newId.insertedId, email: email });
  },
};

export default UsersController;
