import client, {Channel ,Connection, Message} from 'amqplib'
import { Product } from './product'

//await productMessage.consumeQueue('news');
const connection: Connection = await client.connect("amqp://guest:guest@172.22.169.247:5672")
// Create a channel
const channel: Channel = await connection.createChannel();

const productMessage = new Product(channel, connection);
// Makes the queue available to the client
await channel.assertQueue('news')
// Start the consumer 
await channel.consume('news', async (msg: Message | null) => {   
    if (msg) {
      let news = JSON.parse(msg.content.toString());
      channel.ack(msg);
      console.log(news);
      await productMessage.insertDatabase(news.key,news.payload);
    }  
});
