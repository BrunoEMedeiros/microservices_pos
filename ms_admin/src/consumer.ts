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
  email: string
  nickname: string
  birthday: number
  role: string
}

let listaUsers: IUsers[] = [];
let listaEmails: string[] = [];

// consumer for the queue.
// We use currying to give it the channel required to acknowledge the message
const consumer = (channel: Channel) => async (msg: ConsumeMessage | null): Promise<void> => {
  try {
    if (msg) {
      // Display the received message
      console.log(msg.content.toString());
      let user = JSON.parse(msg.content.toString());     
        await banco.query(`INSERT INTO public."User"(name, 
          email, 
          nickname, 
          birthday, 
          password, 
          role, 
          activated, 
          "createdAt", 
          "updatedAt", 
          "deletedAt")
          VALUES ('${user.name}', 
          '${user.email}', 
          '${user.nickname}', 
          '${user.birthday}', 
          '${user.password}', 
          'ADMINISTRATOR', 
          true, 
          '${new Date().toISOString()}', '${new Date().toISOString()}', '1111-11-11');`);
          
          const teste = await banco.query(`SELECT email FROM "User"`);
          //console.log(teste);
          teste.rows.map((email)=>{
              listaEmails.push(email.email);
          });
          //console.log(listaEmails);
          await setRedis('emails_test', JSON.stringify(listaEmails));     
          
          await banco.query(`SELECT id, name, email, nickname, birthday, password, role, activated, "createdAt", "updatedAt", "deletedAt"
                FROM public."User" where activated = false;`).then((res)=>{
                listaUsers = []
                  res.rows.map((news)=>{
                  listaUsers.push(news)
                })
          });
      
          await redisClient.del('unauth_users');
          await setRedis('unauth_users', JSON.stringify(listaUsers));
          channel.ack(msg);
    }
  } catch (error) {
    console.log("error: ", error)
  }
}

const connection: Connection = await client.connect("amqp://guest:guest@172.22.67.77:5672")
// Create a channel
const channel: Channel = await connection.createChannel()
// Makes the queue available to the client
await channel.assertQueue('admin')
// Start the consumer
await channel.consume('admin', consumer(channel));