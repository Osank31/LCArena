import mongoose, { Document, Model } from "mongoose";
import { type ExecutionResult } from "@LCArena/execution"

export enum ELanguage {
    py = "py",
    cpp = "cpp",
    java = "java",
    js = "js"
}

export interface ISubmission extends Document {
    problemId: mongoose.Schema.Types.ObjectId;
    code: string;
    language: ELanguage,
    userId: string;
    status: ExecutionResult,
}

export type SubmissionModel=Model<ISubmission, {}>

const submissionSchema = new mongoose.Schema<ISubmission, SubmissionModel>({
    problemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem"
    },
    code: {
        type: String,
        required: true
    },
    language: {
        type: String,
        enum: Object.values(ELanguage),
        required: true
    },
    userId: {},
    status: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
},
    { timestamps: true }
)


const Submission = mongoose.model<ISubmission>(
    "Submission",
    submissionSchema
);

export default Submission;