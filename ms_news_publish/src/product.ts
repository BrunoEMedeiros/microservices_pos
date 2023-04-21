import client, {Channel ,Connection} from 'amqplib'
import { DatabaseModel } from './DatabaseModel';
import { redisClient, setRedis } from './redis';

const banco = new DatabaseModel().pool;

export interface IMessage{
    key: string,
    payload?: Object
}

export interface INews{
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

    async createConnect(){
      try {        
            this.connection = await client.connect("amqp://guest:guest@172.22.169.247:5672");
            this.channel = await this.connection.createChannel();
        } catch (error) {
            console.log("Error to connect rabbitmq!: ", error);
        }
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
    async updateDatabase(key: string, id: number){
      try {

        await banco.query(`UPDATE public."News" SET "published"=true, "deletedAt"='2222-12-22' WHERE id = ${id};`);

          const msg: IMessage = {
              key: key,
              payload: 1
          }
          //console.log('send insert');
          await new Promise(async (resolve, reject)=>{
            await this.channel.assertQueue(key, {durable: false, autoDelete: true});
            resolve(this.channel.sendToQueue(key, Buffer.from(JSON.stringify(msg))))
          });
          await this.sendCache();
      } catch (error) {
        console.log("error to insert database");
        console.log(error);
        return false;
      }
    }
}
