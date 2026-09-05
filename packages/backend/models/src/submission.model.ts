import mongoose, { Document } from "mongoose";

export enum ELanguage {
    py = "py",
    cpp = "cpp",
}

export enum ESubmissionStatus {
    Pending = "Pending",
    Accepted = "Accepted",
    Rejected = "Rejected",
    Error = "Error"
}

export interface ISubmissionSchema extends Document {
    problemId: string;
    code: string;
    language: ELanguage;
    userId: string;
    status: ESubmissionStatus;
    createdAt: Date;
    updatedAt: Date;
}

const submissionSchema = new mongoose.Schema<ISubmissionSchema>(
    {
        problemId: {
            type: String,
            required: [true, "Problem Id is required"],
        },

        code: {
            type: String,
            required: [true, "Code is required"],
        },

        language: {
            type: String,
            enum: Object.values(ELanguage),
            default: ELanguage.cpp,
            required: true,
        },

        userId: {
            type: String,
            required: [true, "userId required"]
        },

        status: {
            type: String,
            enum: Object.values(ESubmissionStatus),
            default: ESubmissionStatus.Pending,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Submission = mongoose.model<ISubmissionSchema>(
    "Submission",
    submissionSchema
);

export default Submission;