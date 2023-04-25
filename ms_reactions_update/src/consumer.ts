import client, {Channel ,Connection, Message} from 'amqplib'
import { Product } from './product'

//await productMessage.consumeQueue('news');
async function main(){
  const connection: Connection = await client.connect("amqp://guest:guest@172.16.238.10:5672")
// Create a channel
const channel: Channel = await connection.createChannel();

const productMessage = new Product(channel, connection);
// Makes the queue available to the client
await channel.assertQueue('reactionsUpdate')
// Start the consumer 
await channel.consume('reactionsUpdate', async (msg: Message | null) => {   
    if (msg) {
      const reaction = JSON.parse(msg.content.toString());
      reaction.payload.id = parseInt(reaction.payload.id);
      console.log(msg.content.toString());
      await productMessage.insertDatabase(reaction.key, reaction.payload);
    }  
});
}
main();
