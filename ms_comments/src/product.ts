import client, {Channel ,Connection } from 'amqplib'
import { DatabaseModel } from './DatabaseModel';

const banco = new DatabaseModel().pool;

export interface IMessage{
    key: string,
    payload?: Object
}

export interface IComment{
  comment: string,
  userId: number,
  newId: number
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
    
    async insertDatabase(key: string, comment: IComment){
      try {
        let msg: IMessage = {
          key: key,
          payload: 1
        }
        await banco.query(`select id from "User" where role = 'AUTHOR' and activated = true and id =${comment.userId}`).then(async (res)=>{
          //console.log(res.rowCount);
          if(res.rowCount == 1){
            await banco.query(`INSERT INTO public."Comment"(comment, "userID", "newId") VALUES ('${comment.comment}', ${comment.userId}, ${comment.newId});`);
            msg = {
              key: key,
              payload: 1
            }
          }
          else{
            msg = {
              key: key,
              payload: 0
            }
          }

          await new Promise(async (resolve, reject)=>{
            await this.channel.assertQueue(key, {durable: false, autoDelete: true});
            //Send a message to the queue"
            resolve(this.channel.sendToQueue(key, Buffer.from(JSON.stringify(msg))))
          })
        });
      } catch (error) {
        console.log("error to insert database");
        console.log(error);
        return false;
      }
    }
}
