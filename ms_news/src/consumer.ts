import express from 'express';
import client, {Connection, Channel, ConsumeMessage} from 'amqplib'
import { setRedis, redisClient} from './redis'
import { DatabaseModel } from './DatabaseModel';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const banco = new DatabaseModel().pool;

export interface INews{
  title: string
  subtitle: string
  content: string
  userId: number
}

let listaNews: INews[] = [];

// consumer for the queue.
// We use currying to give it the channel required to acknowledge the message
const consumer = (channel: Channel) => async (msg: ConsumeMessage | null): Promise<void> => {
  if (msg) {
    // Display the received message
    console.log(msg.content.toString());
    let noticia = JSON.parse(msg.content.toString());
    let userId = parseInt(noticia.userId);
    await banco.query(`INSERT INTO public."News"(title, subtitle, text, "createdAt", "updatedAt","deletedAt","published","userId")
                                VALUES('${noticia.title}',
                                '${noticia.subtitle}',
                                '${noticia.content}',
                                '${new Date().toISOString()}',
                                '${new Date().toISOString()}',
                                '1111-11-11',
                                false,
                                ${userId})`);

    channel.ack(msg);
    await banco.query(`SELECT id, title, subtitle, text, "createdAt", "updatedAt", "userId"
    FROM public."News" where published=true and "deletedAt" != '1111-11-11' order by "updatedAt" desc`).then((res)=>{
                            listaNews = []
                            res.rows.map((news)=>{
                                listaNews.push(news)
                              })
                            })
    //console.log(listaNews);                        
    await redisClient.del('news');
    await setRedis('news', JSON.stringify(listaNews));
  }
  else{
    console.log("vazio")
  }
}

const connection: Connection = await client.connect("amqp://guest:guest@172.22.67.77:5672")
// Create a channel
const channel: Channel = await connection.createChannel()
// Makes the queue available to the client
await channel.assertQueue('news')
// Start the consumer
await channel.consume('news', consumer(channel));