import client, {Channel ,Connection, Message} from 'amqplib'
import { Product } from './product'

//await productMessage.consumeQueue('news');
async function main(){
  const connection: Connection = await client.connect("amqp://guest:guest@172.16.238.10:5672")
// Create a channel
const channel: Channel = await connection.createChannel();

const productMessage = new Product(channel, connection);
// Makes the queue available to the client
await channel.assertQueue('newsAllAdmin', {durable: true})
// Start the consumer 
await channel.consume('newsAllAdmin', async (msg: Message | null) => {   
    if (msg) {
      let news = JSON.parse(msg.content.toString());
      channel.ack(msg);
      console.log(news);
      await productMessage.sendCache(news.key);
    }  
});
}

main();