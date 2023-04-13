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
    let id = parseInt(noticia);

    await banco.query(`UPDATE public."News" SET "deletedAt"='${new Date().toISOString()}', "published"=false WHERE id = ${id};`);

    channel.ack(msg);
    await banco.query(`SELECT n.id, n.title, n.subtitle, n.text, n."createdAt", n."updatedAt", n."userId", u."nickname"
                      FROM public."News" as n
                      inner join "User" as u
                      on n."userId" = u.id
                      where n.published=true and n."deletedAt" != '1111-11-11' order by n."updatedAt" desc`).then((res)=>{
                            listaNews = []
                            res.rows.map((news)=>{
                                listaNews.push(news)
                              })
                            })
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
await channel.assertQueue('newsDelete')
// Start the consumer
await channel.consume('newsDelete', consumer(channel));