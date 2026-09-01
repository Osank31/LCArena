import express from "express"
import "dotenv/config"
import { APP_PORT, RABBITMQ_URL } from "./constants/constants.js"
import { appErrorHandler } from "@LCArena/middlewares"
import {logger} from "@LCArena/utils"
import cors from "cors"
import { createServer } from "http"
import { Server } from "socket.io"
import amqplib from "amqplib"

const app = express()

app.use(express.json())
app.use(cors())

app.use(appErrorHandler);

// Create HTTP server wrapping Express
const server = createServer(app)

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

const userSockets = new Map<string, Set<string>>()

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string
    if (userId) {
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set())
        }
        userSockets.get(userId)!.add(socket.id)
        logger.info(`WebSocket: User ${userId} connected on socket ${socket.id}`)
    }

    socket.on("disconnect", () => {
        if (userId) {
            const sockets = userSockets.get(userId)
            if (sockets) {
                sockets.delete(socket.id)
                if (sockets.size === 0) {
                    userSockets.delete(userId)
                }
            }
            logger.info(`WebSocket: User ${userId} disconnected from socket ${socket.id}`)
        }
    })
})

// Connect to RabbitMQ and consume completed submissions
async function connectToRabbitMQ() {
    try {
        const connection = await amqplib.connect(RABBITMQ_URL || "amqp://localhost")
        const channel = await connection.createChannel()
        const queueName = "submission.completed"

        await channel.assertQueue(queueName)
        logger.info(`Connected to RabbitMQ and asserted queue: ${queueName}`)

        channel.consume(queueName, (msg) => {
            if (msg !== null) {
                try {
                    const messageContent = JSON.parse(msg.content.toString())
                    logger.info(`Received submission.completed event: ${JSON.stringify(messageContent)}`)

                    const { userId, submissionId, problemId, status, results, failedTestCase } = messageContent

                    if (userId) {
                        const sockets = userSockets.get(userId)
                        if (sockets && sockets.size > 0) {
                            for (const socketId of sockets) {
                                io.to(socketId).emit("submissionCompleted", {
                                    submissionId,
                                    problemId,
                                    status,
                                    results,
                                    failedTestCase
                                })
                            }
                            logger.info(`Dispatched submissionCompleted socket event to user ${userId}`)
                        } else {
                            logger.warn(`No active WebSocket connection for user ${userId}`)
                        }
                    } else {
                        logger.warn("Received submission.completed event with no userId")
                    }

                    channel.ack(msg)
                } catch (consumeError: any) {
                    logger.error("Error processing submission.completed message", consumeError)
                    channel.nack(msg, false, false)
                }
            }
        })
    } catch (error: any) {
        logger.error("Failed to connect to RabbitMQ in Sockets Service", error)
        setTimeout(connectToRabbitMQ, 5000)
    }
}

server.listen(Number(APP_PORT) || 3007, () => {
    logger.info(`Server running on port ${APP_PORT || 3007}`)
    connectToRabbitMQ()
})