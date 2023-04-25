import client, {Channel ,Connection, ConsumeMessage} from 'amqplib'
import { DatabaseModel } from './DatabaseModel';

const banco = new DatabaseModel().pool;

export interface IMessage{
    key: string,
    payload?: Object
}

export interface IUsers{
  id: number,
  name: string,
  email: string,
  nickname: string,
  birthday: Date,
  password: string,
  role: string,
  activated: boolean,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date
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
    
    async updateDatabase(key: string, user: IUsers){
      try {
        let msg: IMessage = {
          key: key,
          payload: 1
        }
        await banco.query(`SELECT id FROM public."User" where nickname = '${user.nickname}'`).then(async (res)=>{
          //console.log(res);
          if(res.rowCount == 0){

            await banco.query(`UPDATE public."User"
            SET name='${user.name}', 
            nickname='${user.nickname}', 
            birthday='${user.birthday}',
            "updatedAt"='${new Date().toISOString()}'
            WHERE id = ${user.id};`);

            msg = {
              key: key,
              payload: 1
            } 
          }else{
            msg = {
              key: key,
              payload: 0
            } 
          }
        });
           //console.log('send not insert');
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
