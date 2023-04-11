import express from 'express';
import client, {Connection, Channel, ConsumeMessage} from 'amqplib'
import { DatabaseModel } from './DatabaseModel';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const banco = new DatabaseModel().pool;

// consumer for the queue.
// We use currying to give it the channel required to acknowledge the message
const consumer = (channel: Channel) => async (msg: ConsumeMessage | null): Promise<void> => {
 try {
  if (msg) {
    // Display the received message
    console.log(msg.content.toString());
    const id = parseInt(JSON.parse(msg.content.toString()));
    
    await banco.query(`DELETE FROM public."Comment" WHERE id=${id};`);

    channel.ack(msg);

  }
  else{
    console.log("vazio")
  }
 } catch (error) {
    console.log(error);
 }
}

const connection: Connection = await client.connect("amqp://guest:guest@172.22.67.77:5672")
// Create a channel
const channel: Channel = await connection.createChannel()
// Makes the queue available to the client
await channel.assertQueue('commentDelete')
// Start the consumer
await channel.consume('commentDelete', consumer(channel));