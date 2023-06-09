import client, {Channel ,Connection } from 'amqplib'
import { DatabaseModel } from './DatabaseModel';
import { redisClient } from './redis';

const banco = new DatabaseModel().pool;

export interface IMessage{
    key: string,
    payload?: Object
}

export interface INews{
  id: number
  title: string
  subtitle: string
  content: string
  userId: number
}

let listNews: INews[] = [];

export class Product{ 
    private connection: Connection | any;
    private channel: Channel | any;
    
    constructor(channel?: Channel, connection?: Connection){
      this.connection = connection ?? null
      this.channel = channel ?? null
    }
    
    async sendCache(key: string){
      try {
        await banco.query(`SELECT n.id, n.title, n.subtitle, n.text, n."createdAt", n."updatedAt", n."deletedAt", n.published, n."userId", u."nickname"
        FROM public."News" as n
        inner join "User" as u
        on n."userId" = u.id
        order by n."updatedAt" desc`).then((res)=>{
              listNews = []
              res.rows.map((news)=>{
                listNews.push(news)
                })
              });

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
