import express from 'express';
import client, {Connection, Channel, ConsumeMessage} from 'amqplib'
import { setRedis, redisClient} from './redis'
import { DatabaseModel } from './DatabaseModel';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const banco = new DatabaseModel().pool;

export interface IUsers{
  name: string
  nickname: string
  birthday: number
}

let listaUsers: IUsers[] = [];

// consumer for the queue.
// We use currying to give it the channel required to acknowledge the message
const consumer = (channel: Channel) => async (msg: ConsumeMessage | null): Promise<void> => {
  try {
    if (msg) {
      // Display the received message
      console.log(msg.content.toString());
      let user = JSON.parse(msg.content.toString());
      
      await banco.query(`UPDATE public."User"
      SET name='${user.name}', nickname='${user.nickname}', birthday='${user.birthday}',"updatedAt"='${new Date().toISOString()}'
      WHERE id = ${user.id};`);
      
      await banco.query(`SELECT id, name, email, nickname, birthday, password, role, activated, "createdAt", "updatedAt", "deletedAt"
      FROM public."User" where activated = true;`).then((res)=>{
                              listaUsers = []
                              res.rows.map((news)=>{
                                listaUsers.push(news)
                                })
                              })
      //console.log(listaNews); 
      await redisClient.del('auth_users');            
      await setRedis('auth_users', JSON.stringify(listaUsers));
      channel.ack(msg);
    }
    else{
      console.log("vazio")
    }
  } catch (error) {
    console.log("error: ", error);
  }
}

const connection: Connection = await client.connect("amqp://guest:guest@172.22.67.77:5672")
// Create a channel
const channel: Channel = await connection.createChannel()
// Makes the queue available to the client
await channel.assertQueue('usersUpdate')
// Start the consumer
await channel.consume('usersUpdate', consumer(channel));