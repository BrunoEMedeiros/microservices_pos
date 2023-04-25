import client, {Channel ,Connection, Message} from 'amqplib'
import { Product } from './product'

//await productMessage.consumeQueue('news');
const connection: Connection = await client.connect("amqp://guest:guest@172.16.238.10:5672")
// Create a channel
const channel: Channel = await connection.createChannel()
// Makes the queue available to the client
const productMessage = new Product(channel, connection);
// Makes the queue available to the client
await channel.assertQueue('readers')
// Start the consumer 
await channel.consume('readers', async (msg: Message | null) => {   
    if (msg) {
      let user = JSON.parse(msg.content.toString());
      channel.ack(msg);
      console.log(user);
      await productMessage.insertDatabase(user.key, user.payload);
    }  
});
