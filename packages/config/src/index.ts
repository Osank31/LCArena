import { dbConnect } from "./db.config.js";
import { channel, connectToQueue, queue } from "./rabbitMQ.config.js";

export {
    dbConnect,
    channel, 
    queue,
    connectToQueue
}