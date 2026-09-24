import axios from "axios";
import mongoose from "mongoose";
import { CreateSubmissionInput, UpdateSubmissionInput } from "./validations";
import {channel, queue} from "@LCArena/config"
import { BadRequestError, InternalServerError, NotFoundError } from "@LCArena/utils";
import { Submission } from "@LCArena/models";
import { type ExecutionResult } from "@LCArena/execution"
 
export const evaluationService = async (data: CreateSubmissionInput & {userId: string}) => {
    const {problemId, code, language, status, userId} = data
    
    if (!channel || !queue) {
        throw new InternalServerError("Rabbit Mq chnnel or queue not found")
    }
    
    

    const submission = await Submission.create({
        problemId: new mongoose.Types.ObjectId(problemId),
        code,
        language,
        userId: new mongoose.Types.ObjectId(userId),
        status: {
            status: "PENDING"
        }
    });

    channel.sendToQueue(queue.submissionCreated, Buffer.from(JSON.stringify({
        code,
        language,
        status,
        submissionId: submission._id,
        userId,
        problemId
    })));

    return submission;
}

export const updateSubmissionService = async (data: UpdateSubmissionInput & {submissionId:String}) => {
    const {problemId, code, language, status, submissionId} = data

    return await Submission.findByIdAndUpdate(submissionId, {
        problemId,
        code,
        language,
        status
    }, {new: true})
}