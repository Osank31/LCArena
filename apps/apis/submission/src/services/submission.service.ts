import { CreateSubmissionInput, UpdateSubmissionInput } from "../validations/submission.validation.js";
import {channel, queue} from "@LCArena/config"
import { BadRequestError, InternalServerError, NotFoundError } from "@LCArena/utils";
import axios from "axios";
import { PROBLEM_SERVICE_URL } from "../constants/constants.js";
import mongoose from "mongoose";
import { Submission, ESubmissionStatus } from "@LCArena/models";

export const evaluationService = async (data: CreateSubmissionInput & {userId: string}) => {
    const {problemId, code, language, status, userId} = data
    
    if (!channel || !queue) {
        throw new InternalServerError("Rabbit Mq chnnel or queue not found")
    }
    
    if (!mongoose.Types.ObjectId.isValid(problemId)) {
        throw new BadRequestError("Invalid problem id")
    }

    const submission = await Submission.create({
        problemId,
        code,
        language,
        status: ESubmissionStatus.Pending,
        userId
    });

    
    const problemDataResponse = await axios.get(`${PROBLEM_SERVICE_URL}/${problemId}`)

    if (!problemDataResponse?.data?.success) {
        throw new NotFoundError("Problem not found")
    }

    const problemData = problemDataResponse.data.data

    channel.sendToQueue(queue.submissionCreated, Buffer.from(JSON.stringify({
        problemData,
        code,
        language,
        status,
        submissionId: submission._id,
        userId,
    })));

    return submission;
}

export const updateSubmission = async (data: UpdateSubmissionInput & {submissionId:String}) => {
    const {problemId, code, language, status, submissionId} = data

    const submission = await Submission.findByIdAndUpdate(submissionId, {
        problemId,
        code,
        language,
        status
    }, {new: true})

    return submission
}