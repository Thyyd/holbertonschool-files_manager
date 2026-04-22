import mongodb from 'mongodb'

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '27017';
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';

const DB_URL = `mongodb://${DB_HOST}:${DB_PORT}`;

class DBClient {
  // Constructeur
  constructor() {
    this.client = new mongodb.MongoClient(DB_URL, {});
    this.client.connect();
    this.database = DB_DATABASE;
  }

  // Méthode isAlive
  isAlive() {
    return this.client.isConnected();
  }

  // Méthode nbUsers
  async nbUsers() {
    const userCount = await this.client.db(this.database).collection('users').countDocuments();
    return userCount;
  }

  // Méthode nbFiles
  async nbFiles() {
    const filesCount = await this.client.db(this.database).collection('files').countDocuments();
    return filesCount;
  }
}

const dbClient = new DBClient();
export default dbClient;
