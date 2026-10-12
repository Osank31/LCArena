import mongoose, { Document, Model } from "mongoose";
import { type ExecutionResult } from "@LCArena/execution"

export enum ELanguage {
    py = "py",
    cpp = "cpp",
    java = "java",
    js = "js"
}

export interface ISubmission extends Document {
    problemId: mongoose.Types.ObjectId;
    code: string;
    language: ELanguage,
    userId: mongoose.Types.ObjectId;
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
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    status: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
},
    { timestamps: true }
)

submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ problemId: 1, createdAt: -1 });

const Submission = mongoose.model<ISubmission>(
    "Submission",
    submissionSchema
);

export default Submission;