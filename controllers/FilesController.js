import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import db from '../utils/db';
import redis from '../utils/redis';

const FilesController = {
  // Méthode postUpload
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
      const file = await db.database.collection('files').findOne({ _id: new ObjectId(parentId) });
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
        userId: new ObjectId(userId), name, type, isPublic, parentId,
      };
      const folderDocument = await db.database.collection('files').insertOne(document);
      // Retour de l'id ET des paramètres du doc.
      // '...document' permet "d'étaler" les attributs de document.
      return res.status(201).json({ id: folderDocument.insertedId, ...document });
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
      userId: new ObjectId(userId), name, type, isPublic, parentId, localPath: filePath,
    };
    const newDocument = await db.database.collection('files').insertOne(document);
    // Retour de l'id ET des paramètres du doc.
    // '...document' permet "d'étaler" les attributs de document.
    return res.status(201).json({ id: newDocument.insertedId, ...document });
  },

  // Méthode getShow
  getShow: async (req, res) => {
    const { id } = req.params;

    // Récupération de l'user Redis id
    const xTokenHeader = req.header('x-token');
    const key = `auth_${xTokenHeader}`;
    const userId = await redis.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const objectId = new ObjectId(id);

      const fileToShow = await db.database.collection('files').findOne({ _id: objectId, userId: new ObjectId(userId) });
      if (!fileToShow) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(fileToShow);
    } catch (_err) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  // Méthode getIndex
  getIndex: async (req, res) => {
    // Récupération de l'user Redis id
    const xTokenHeader = req.header('x-token');
    const key = `auth_${xTokenHeader}`;
    const userId = await redis.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Récupération des query parameters
      const parentId = req.query.parentId || '0';
      const page = Number(req.query.page || 0);

      // Vérification que page ne soit ni NaN, ni négatif. S'il l'est, renvoie 0, sinon page
      const pagination = Number.isNaN(page) || page < 0 ? 0 : page;

      // Conversion d'userId en ObjectId pour le chercher dans la DB
      const matchQuery = { userId: new ObjectId(userId) };

      if (parentId === '0') {
        // Cas "root"
        matchQuery.parentId = { $in: [0, '0'] };
      } else if (ObjectId.isValid(parentId)) {
        // Vérification du parentId récupéré en query sous format ObjectId
        // Sinon, vérification tel quel, sans conversion
        matchQuery.parentId = { $in: [parentId, new ObjectId(parentId)] };
      } else {
        matchQuery.parentId = parentId;
      }

      // Création de la pagination
      const listFile = await db.database.collection('files').find(matchQuery)
        .skip(pagination * 20)
        .limit(20)
        .toArray();

      // return res.status(200).json(listFile);
      return res.status(200).json(listFile.map((file) => ({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      })));
    } catch (_err) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  // Méthode putPublish
  putPublish: async (req, res) => {
    const { id } = req.params;

    // Récupération de l'user Redis id
    const xTokenHeader = req.header('x-token');
    const key = `auth_${xTokenHeader}`;
    const userId = await redis.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const objectId = new ObjectId(id);

      const fileToPublish = await db.database.collection('files').findOneAndUpdate(
        { _id: objectId, userId: new ObjectId(userId) },
        { $set: { isPublic: true } },
        { returnDocument: 'after' },
      );

      if (!fileToPublish.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json({
        id: fileToPublish.value._id.toString(),
        userId: fileToPublish.value.userId.toString(),
        name: fileToPublish.value.name,
        type: fileToPublish.value.type,
        isPublic: fileToPublish.value.isPublic,
        parentId: fileToPublish.value.parentId,
      });
    } catch (_err) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  // Méthode putUnpublish
  putUnpublish: async (req, res) => {
    const { id } = req.params;

    // Récupération de l'user Redis id
    const xTokenHeader = req.header('x-token');
    const key = `auth_${xTokenHeader}`;
    const userId = await redis.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const objectId = new ObjectId(id);

      const fileToUnpublish = await db.database.collection('files').findOneAndUpdate(
        { _id: objectId, userId: new ObjectId(userId) },
        { $set: { isPublic: false } },
        { returnDocument: 'after' },
      );
      if (!fileToUnpublish.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json({
        id: fileToUnpublish.value._id.toString(),
        userId: fileToUnpublish.value.userId.toString(),
        name: fileToUnpublish.value.name,
        type: fileToUnpublish.value.type,
        isPublic: fileToUnpublish.value.isPublic,
        parentId: fileToUnpublish.value.parentId,
      });
    } catch (_err) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },

  // Méthode getFile
  getFile: async (req, res) => {
    const { id } = req.params;

    // Récupération de l'user Redis id
    const xTokenHeader = req.header('x-token');
    const key = `auth_${xTokenHeader}`;
    const userId = await redis.get(key);

    try {
      const objectId = new ObjectId(id);

      const linkedFile = await db.database.collection('files').findOne({ _id: objectId });
      if (!linkedFile) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (linkedFile.isPublic === false && (!userId || linkedFile.userId.toString() !== userId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (linkedFile.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      // Vérification du localPath
      if (!linkedFile.localPath || !fs.existsSync(linkedFile.localPath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Récupération du MIME-type et du Content du file
      const mimeFile = mime.contentType(linkedFile.name);
      const fileContent = fs.readFileSync(linkedFile.localPath);

      res.setHeader('Content-Type', mimeFile); // Définit le MIME-type dans les Headers res
      return res.status(200).send(fileContent);
    } catch (_err) {
      return res.status(500).json({ error: 'Internal error' });
    }
  },
};

export default FilesController;
