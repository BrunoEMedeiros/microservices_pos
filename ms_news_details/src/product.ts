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
  userId: number
}

export interface INewDetails{
  id: number ,
  title: string,
  subtitle: string, 
  text: string,  
  updatedAt: Date, 
  userId: number,
  author: string,
  nickname: string,
  comment: string[],
  like: number,
  dislike: number,
  myreaction: string
}

let objeto: INewDetails = {
  id: 0 ,
  title: '',
  subtitle: '', 
  text: '', 
  updatedAt: new Date(), 
  userId: 0,
  author: '',
  nickname: '',
  comment: [],
  like: 0,
  dislike: 0,
  myreaction: 'LIKE'
}

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

    async sendCache(key: string, obj: INews){
      try {

        await banco.query(`SELECT c."comment" FROM public."News" as n
        join "Comment" as c
        on c."newId" = n.id
        where n.id = ${obj.id}`).then((res)=>{
            objeto.comment = []
            res.rows.map((comment)=>{
              objeto.comment.push(comment.comment);
            })
        });

        await banco.query(`select
        (select Count(id) as "LIKE" from "Reaction" where reaction = 'LIKED' and "newId" = ${obj.id}) as Liked,
        (select Count(id) as "DISLIKE" from "Reaction" where reaction = 'DISLIKED' and "newId" = ${obj.id}) as Disliked,
        (select reaction from "Reaction" where "userId" = ${obj.userId}) as Myreaction`).then((res)=>{
            objeto.like = res.rows[0].liked,
            objeto.dislike = res.rows[0].disliked,
            objeto.myreaction = res.rows[0].myreaction
        });

        await banco.query(`SELECT n.id, n.title, n.subtitle, n.text, n."createdAt", n."updatedAt", n."userId", u.name, u.nickname
        FROM public."News" as n
        join "User" as u
        on n."userId" = u.id
        where n.id = ${obj.id}`).then((res)=>{
            objeto.id = res.rows[0].id,
            objeto.title = res.rows[0].title,
            objeto.subtitle = res.rows[0].subtitle,
            objeto.text = res.rows[0].text,
            objeto.updatedAt = res.rows[0].updatedAt,
            objeto.userId = res.rows[0].userId,
            objeto.author = res.rows[0].name,
            objeto.nickname = res.rows[0].nickname
        });

        console.log(objeto);

        await redisClient.set(key, JSON.stringify(objeto), 'EX', 20);

        await new Promise(async (resolve, reject)=>{
          await this.channel.assertQueue(key, {durable: false, autoDelete: true});
          resolve(this.channel.sendToQueue(key, Buffer.from(JSON.stringify(0))));
        });

      } catch (error) {
        console.log("Error to send to redis")
      }
    }
}
