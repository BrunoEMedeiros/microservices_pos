import client, {Channel ,Connection } from 'amqplib'
import { DatabaseModel } from './DatabaseModel';
import { redisClient, setRedis } from './redis';

const banco = new DatabaseModel().pool;

export interface IMessage{
    key: string,
    payload?: Object
}

export interface INews{
  id: number,
  title: string,
  subtitle: string,
  content: string,
  createdAt: Date, 
  updatedAt: Date, 
  deletedAt: Date, 
  published: boolean,
  userId: number,
}


let listNews: INews[] = [];

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

        await banco.query(`select * from "News" where "userId" = ${id} order by "updatedAt" desc`).then((res)=>{
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
