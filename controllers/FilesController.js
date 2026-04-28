import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import db from '../utils/db';
import redis from '../utils/redis';

const FilesController = {
  postUpload: async (req, res) => {
    // Récupération du header X-Token
    const xTokenHeader = req.headers['x-token'];
    const key = `auth_${xTokenHeader}`;

    const userId = await redis.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Récupération des paramètres du file
    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    // Vérifications de name, type et data
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Vérification du parentId
    if (parentId) {
      const file = await db.client.db(db.database).collection('files').findOne({ _id: new ObjectId(parentId) });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Si le type du file est un folder
    if (type === 'folder') {
      const document = {
        userId, name, type, isPublic, parentId,
      };
      const newDocument = await db.client.db(db.database).collection('files').insertOne(document);
      // Retour de l'id ET des paramètres du doc.
      // '...document' permet "d'étaler" les attributs de document.
      return res.status(201).json({ id: newDocument.insertedId, ...document });
    }

    // Récupération du dossier de stockage via la variable d'environnement FOLDER_PATH
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    // Création du dossier s'il n'existe pas
    fs.mkdirSync(folderPath, { recursive: true });
    const fileName = uuidv4();
    const filePath = path.join(folderPath, fileName);

    // Écriture du fichier situé à filePath avec la data
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

    // Stockage du file
    const document = {
      userId, name, type, isPublic, parentId, localPath: filePath,
    };
    const newDocument = await db.client.db(db.database).collection('files').insertOne(document);
    // Retour de l'id ET des paramètres du doc.
    // '...document' permet "d'étaler" les attributs de document.
    return res.status(201).json({ id: newDocument.insertedId, ...document });
  },

  // Méthode getShow
  getShow: async (req, res) => {
    const id = req.params.id;

    // Récupération de l'user Redis id
    const xTokenHeader = req.headers['x-token'];
    const key = `auth_${xTokenHeader}`;
    const userId = await redis.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Récupération de l'User dans la DB
    const user = await db.client.db(db.database).collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const objectId = new ObjectId(id);

      const fileToShow = await db.client.db(db.database).collection('files').findOne({ _id: objectId, userId });
      if (!fileToShow) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(fileToShow);
    }
    catch (_err) {
      return res.status(404).json({ error: 'Not found' });
    }
  },

  // Méthode getIndex
  getIndex: async (req, res) => {
    // Récupération de l'user Redis id
    const xTokenHeader = req.headers['x-token'];
    const key = `auth_${xTokenHeader}`;
    const userId = await redis.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Récupération de l'User dans la DB
    const user = await db.client.db(db.database).collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Récupération des query parameters
      const { parentId = '0', page = 0 } = req.query;

      let parentIdFinal = parentId;
      if (parentId === 0 || parentId === '0') {
        parentIdFinal = 0;
      }

      // Création de la pagination en utilisant .aggregate
      const listFile = await db.client.db(db.database).collection('files').aggregate([
        { $match: { userId, parentId: parentIdFinal } },
        { $skip: parseInt(page) * 20 },
        { $limit: 20 }
      ]).toArray();

      return res.status(200).json(listFile);
    }
    catch (_err) {
      return res.status(404).json({ error: 'Not found' });
    }
  },
};

export default FilesController;
