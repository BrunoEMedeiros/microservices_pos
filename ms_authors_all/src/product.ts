import client, {Channel ,Connection } from 'amqplib'
import { DatabaseModel } from './DatabaseModel';
import { redisClient, setRedis } from './redis';

const banco = new DatabaseModel().pool;

export interface IMessage{
    key: string,
    payload?: Object
}

export interface IDetails{
  id: number,
  name: string,
  nickname: string,
  quant: number
}


let listNews: IDetails[] = [];

export class Product{ 
    private connection: Connection | any;
    private channel: Channel | any;
    
    constructor(channel?: Channel, connection?: Connection){
      this.connection = connection ?? null
      this.channel = channel ?? null
    }

    async createConnect(){
      try {        
            this.connection = await client.connect("amqp://guest:guest@172.16.238.10:5672");
            this.channel = await this.connection.createChannel();
        } catch (error) {
            console.log("Error to connect rabbitmq!: ", error);
        }
    }

    async sendCache(key: string, id: number){
      try {

        await banco.query(`SELECT 
        u.id, u.name, u.nickname,
        count(n.id) as QUANT
        FROM "User" as u
        INNER JOIN "News" as n ON u.id = n."userId"
		    where n.published = true
        GROUP BY u.id`).then((res)=>{
            listNews = [];
            res.rows.map((news)=>{
              listNews.push(news);
            })
        });

        console.log(listNews);

        await redisClient.set(key, JSON.stringify(listNews), 'EX', 20);

        await new Promise(async (resolve, reject)=>{
          await this.channel.assertQueue(key, {durable: false, autoDelete: true});
          resolve(this.channel.sendToQueue(key, Buffer.from(JSON.stringify(0))));
        });

      } catch (error) {
        console.log("Error to send to redis")
      }
    }
}
