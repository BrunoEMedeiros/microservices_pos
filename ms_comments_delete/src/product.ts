import client, {Channel ,Connection } from 'amqplib'
import { DatabaseModel } from './DatabaseModel';

const banco = new DatabaseModel().pool;

export interface IMessage{
    key: string,
    payload?: Object
}

export interface IComment{
    id: number,
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
      
          await banco.query(`DELETE FROM public."Comment" WHERE id=${comment.id};`);
            msg = {
              key: key,
              payload: 1
            }

          await new Promise(async (resolve, reject)=>{
            await this.channel.assertQueue(key, {durable: false, autoDelete: true});
            //Send a message to the queue"
            resolve(this.channel.sendToQueue(key, Buffer.from(JSON.stringify(msg))))
          });

      } catch (error) {
        console.log("error to insert database");
        console.log(error);
        return false;
      }
    }
}
