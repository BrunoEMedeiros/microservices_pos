import client, {Channel ,Connection} from 'amqplib'
import { DatabaseModel } from './DatabaseModel';

const banco = new DatabaseModel().pool;

export interface IMessage{
    key: string,
    payload?: Object
}

export interface IUser{
  nickname: string
  password: string
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
    
    async insertDatabase(key: string, user: IUser){
      try {
        let msg: IMessage = {
          key: key,
          payload: 1
        }
        await banco.query(`select id from "User" where nickname = '${user.nickname}' and password = '${user.password}'`).then(async (res)=>{
          if(res.rowCount != 0){
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
          });
        });
      } catch (error) {
        console.log("error to insert database");
        console.log(error);
        return false;
      }
    }
}
