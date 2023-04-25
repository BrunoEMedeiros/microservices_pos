import client, {Channel ,Connection } from 'amqplib'
import { DatabaseModel } from './DatabaseModel';
import { redisClient, setRedis } from './redis';

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
    
    async sendCache(){
      try {
        await redisClient.del('all_news');
        await banco.query(`SELECT n.id, n.title, n.subtitle, n.text, n."createdAt", n."updatedAt", n."userId", u."nickname"
        FROM public."News" as n
        inner join "User" as u
        on n."userId" = u.id
        where n.published=true and n."deletedAt" != '1111-11-11' order by n."updatedAt" desc`).then((res)=>{
              listNews = []
              res.rows.map((news)=>{
                listNews.push(news)
                })
              });
        await setRedis('all_news', JSON.stringify(listNews));
      } catch (error) {
        console.log("Error to send to redis")
      }
    }
}
