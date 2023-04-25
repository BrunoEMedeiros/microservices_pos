import client, {Channel ,Connection, Message} from 'amqplib'
import { Product } from './product'

//await productMessage.consumeQueue('news');
const connection: Connection = await client.connect("amqp://guest:guest@172.16.238.10:5672")
// Create a channel
const channel: Channel = await connection.createChannel()
// Makes the queue available to the client
const productMessage = new Product(channel, connection);
// Makes the queue available to the client
await channel.assertQueue('usersUpdate')
// Start the consumer 
await channel.consume('usersUpdate', async (msg: Message | null) => {   
    if (msg) {
      let user = JSON.parse(msg.content.toString());
      channel.ack(msg);
      console.log(user);
      await productMessage.updateDatabase(user.key, user.payload);
    }  
});
