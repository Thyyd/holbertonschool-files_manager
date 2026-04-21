import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  // Constructeur
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (error) => {
      console.log(`Redis client not connected to the server: ${error.message}`);
    });

    // Gestion des promisify
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.expireAsync = promisify(this.client.expire).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  // Méthode isAlive
  isAlive() {
    return this.client.connected;
  }

  // Méthode get
  async get(key) {
    return this.getAsync(key);
  }

  // Méthode set
  async set(key, value, duration) {
    await this.setAsync(key, value);
    await this.expireAsync(key, duration);
  }

  // Méthode del
  async del(key) {
    await this.delAsync(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
