import express from 'express';
import client, {Connection, Channel, ConsumeMessage} from 'amqplib'
import { setRedis, redisClient} from './redis'
import { DatabaseModel } from './DatabaseModel';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const banco = new DatabaseModel().pool;

let listaEmails: string[] = []

// consumer for the queue.
// We use currying to give it the channel required to acknowledge the message
const consumer = (channel: Channel) => async (msg: ConsumeMessage | null): Promise<void> => {
  try {
    if (msg) {
      // Display the received message
      listaEmails = [];
      await banco.query(`select id from "User" where activated = true`).then((res)=>{
        res.rows.map((id)=>{
          listaEmails.push(id.id);
        });
      });
      //console.log(teste);
      console.log(listaEmails);

      await redisClient.del('auth_users_test');
      await setRedis('auth_users_test', JSON.stringify(listaEmails));
      channel.ack(msg)
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
await channel.assertQueue('validate_activated')
// Start the consumer
await channel.consume('validate_activated', consumer(channel));