import { ObjectId } from 'mongodb';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import Bull from 'bull';
import db from '../utils/db';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  // Vérifications de fileId et userId
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  // Recherche du document
  const file = await db.database.collection('files').findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });
  if (!file) {
    throw new Error('File not found');
  }

  // Récupération du path
  const filePath = file.localPath;
  // Génération des thumbnail
  const widths = [500, 250, 100];
  for (const width of widths) {
    const thumbnail = await imageThumbnail(filePath, { width });
    const thumbnailPath = `${filePath}_${width}`;
    fs.writeFileSync(thumbnailPath, thumbnail);
  }
});
