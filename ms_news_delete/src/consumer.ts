import client, {Channel ,Connection, Message} from 'amqplib'
import { Product } from './product'

//await productMessage.consumeQueue('news');
async function main(){
  const connection: Connection = await client.connect("amqp://guest:guest@172.16.238.10:5672")
// Create a channel
const channel: Channel = await connection.createChannel();

const productMessage = new Product(channel, connection);
// Makes the queue available to the client
await channel.assertQueue('newsDelete', {durable: true});
// Start the consumer 
await channel.consume('newsDelete', async (msg: Message | null) => {   
    if (msg) {
      let news = JSON.parse(msg.content.toString());
      let id = parseInt(news.payload); 
      channel.ack(msg);
      console.log(news);
      await productMessage.updateDatabase(news.key, id);
    }  
});
}

main();