import client, {Channel ,Connection} from 'amqplib'
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
            this.connection = await client.connect("amqp://guest:guest@172.16.238.10:5672");
            this.channel = await this.connection.createChannel();
        } catch (error) {
            console.log("Error to connect rabbitmq!: ", error);
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

          await new Promise(async (resolve, reject)=>{
            await this.channel.assertQueue('newsAll', {durable: true});
            //Send a message to the queue"
            resolve(this.channel.sendToQueue('newsAll', Buffer.from(JSON.stringify(msg))))
          });
      } catch (error) {
        console.log("error to insert database");
        console.log(error);
        return false;
      }
    }
}
