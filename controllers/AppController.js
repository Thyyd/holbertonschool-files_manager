import db from '../utils/db.mjs';
import redis from '../utils/redis.mjs';

const AppController = {
  getStatus: (req, res) => {
    res.status(200).json({"redis": redis.isAlive(), "db": db.isAlive()});
  },

  getStats: async (req, res) => {
    const nbUsers = await db.nbUsers();
    const nbFiles = await db.nbFiles();

    res.status(200).json({"users": nbUsers, "files": nbFiles});
  }
};

export default AppController;
