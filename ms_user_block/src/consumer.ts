import express from 'express';
import client, {Connection, Channel, ConsumeMessage} from 'amqplib'
import { setRedis, redisClient} from './redis'
import { DatabaseModel } from './DatabaseModel';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const banco = new DatabaseModel().pool;
let listaUsers: IUsers[] = [];
let listaValidos: string[] = [];

export interface IUsers{
  name: string
  email: string
  nickname: string
  birthday: number
  role: string
}

// consumer for the queue.
// We use currying to give it the channel required to acknowledge the message
const consumer = (channel: Channel) => async (msg: ConsumeMessage | null): Promise<void> => {
  if (msg) {
    // Display the received message
    console.log(msg.content.toString());
    let noticia = JSON.parse(msg.content.toString());
    let id = parseInt(noticia);

    await banco.query(`select COUNT(id) from "News" where "userId" = ${id}`).then(async (res)=>{
        if(res.rows[0].count != 0){
          await setRedis('invalid_block', JSON.stringify('nao'));
        }else{
          await redisClient.del('invalid_block');

          listaValidos = [];
          await banco.query(`select id from "User" where activated = true`).then((res)=>{
            res.rows.map((id)=>{
              listaValidos.push(id.id);
            });
          });
          //console.log(teste);
          //console.log(listaEmails);
          await banco.query(`SELECT id, name, email, nickname, birthday, password, role, activated, "createdAt", "updatedAt", "deletedAt"
            FROM public."User" where activated = true;`).then((res)=>{
                                  listaUsers = []
                                  res.rows.map((users)=>{
                                      listaUsers.push(users)
                                    })
                                  })
                                  
          await redisClient.del('auth_users');
          await redisClient.del('auth_users_test');
          await setRedis('auth_users_test', JSON.stringify(listaValidos));
          await setRedis('auth_users', JSON.stringify(listaUsers));
        }
    });
    channel.ack(msg);
  }
  else{
    console.log("vazio")
  }
}

const connection: Connection = await client.connect("amqp://guest:guest@172.22.67.77:5672")
// Create a channel
const channel: Channel = await connection.createChannel()
// Makes the queue available to the client
await channel.assertQueue('usersBlock')
// Start the consumer
await channel.consume('usersBlock', consumer(channel));