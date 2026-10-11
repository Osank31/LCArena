import axios from "axios";
import mongoose from "mongoose";
import { CreateSubmissionInput, UpdateSubmissionInput } from "./validations";
import {channel, queue} from "@LCArena/config"
import { BadRequestError, InternalServerError, NotFoundError } from "@LCArena/utils";
import { Submission } from "@LCArena/models";
import { type ExecutionResult } from "@LCArena/execution"
 
export const evaluationService = async (data: CreateSubmissionInput & {userId: string}) => {
    const {problemId, code, language, userId} = data
    
    if (!channel || !queue) {
        throw new InternalServerError("Rabbit Mq chnnel or queue not found")
    }

    // The initial verdict is always minted server-side; clients cannot inject
    // an execution outcome through the create payload.
    const status: ExecutionResult = { status: "PENDING" }

    const submission = await Submission.create({
        problemId: new mongoose.Types.ObjectId(problemId),
        code,
        language,
        userId: new mongoose.Types.ObjectId(userId),
        status
    });

    channel.sendToQueue(queue.submissionCreated, Buffer.from(JSON.stringify({
        code,
        language,
        status: submission.status,
        submissionId: submission._id,
        userId,
        problemId
    })));

    return submission;
}

export const updateSubmissionService = async (data: UpdateSubmissionInput & {submissionId:string}) => {
    const {problemId, code, language, status, submissionId} = data

    const submission = await Submission.findByIdAndUpdate(submissionId, {
        problemId,
        code,
        language,
        status
    }, {returnDocument: "after"})

    if (!submission) {
        throw new NotFoundError("Submission not found")
    }

    return submission
}

export const getSubmissionService = async (submissionId: string) => {
    const submission = await Submission.findById(submissionId)

    if (!submission) {
        throw new NotFoundError("Submission not found")
    }

    return submission
}