import mongoose, { Document, Model } from "mongoose";

export interface IProblem extends Document {
    description: string;
    difficulty: "Easy" | "Medium" | "Hard",
    sampleTestCaseUrl: string;
    testCasesUrl: string;
    time_limit: number;
}

export type ProblemModel = Model<IProblem, {}>

const problemSchema = new mongoose.Schema<IProblem, ProblemModel>({
        description: { type: String, required: true },
        difficulty: {
            type: String,
            required: true,
            enum: ["Easy", "Medium", "Hard"],
        },
        sampleTestCaseUrl: { type: String, required: true },
        testCasesUrl: { type: String, required: true },
        time_limit: {type: Number, required: true, default: 5000}
    }, { timestamps: true }
);

const Problem = mongoose.model<IProblem>("Problem", problemSchema)

export default Problem;