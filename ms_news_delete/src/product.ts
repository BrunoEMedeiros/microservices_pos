import client, {Channel ,Connection, ConsumeMessage} from 'amqplib'
import { Message } from 'amqplib/callback_api'
import { DatabaseModel } from './DatabaseModel';

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

    async updateDatabase(key: string, id: number){
      try {
        let msg: IMessage = {
          key: key,
          payload: 1
        }
        await banco.query(`select id from "News" where id 
        in(select "newId" from "Comment" where "newId" = ${id}) or 
        id in(select "newId" from "Reaction" where "newId" = ${id});`).then(async (res)=>{
          //console.log(res.rowCount);
          if(res.rowCount == 0){
            await banco.query(`UPDATE public."News" SET "deletedAt"='${new Date().toISOString()}', 
              "published"=false WHERE id = ${id};`);
              msg = {
                  key: key,
                  payload: 1
              }
          }
          else{
            msg = {
              key: key,
              payload: 0
            }}
        });
        //console.log('send insert');
        await new Promise(async (resolve, reject)=>{
          await this.channel.assertQueue(key, {durable: false, autoDelete: true});
          resolve(this.channel.sendToQueue(key, Buffer.from(JSON.stringify(msg))))
        });
      } catch (error) {
        console.log("error to update database");
        console.log(error);
        return false;
      }
    }
}
