import mongoose, { Document, Model } from "mongoose";

export interface IProblem extends Document {
    number: number;
    description: string;
    difficulty: "Easy" | "Medium" | "Hard",
    sampleTestCaseUrl: string;
    testCasesUrl: string;
    time_limit: number;
}

export type ProblemModel = Model<IProblem, {}>

const problemSchema = new mongoose.Schema<IProblem, ProblemModel>({
        number: { type: Number, required: true },
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


problemSchema.pre<IProblem & Document>("save", async function () {
    if (this.isNew && !this.number) {
        const Model = this.constructor as Model<IProblem>;

        const lastProblem = await Model.findOne()
            .sort({ number: -1 })
            .select("number")
            .exec();

        this.number = (lastProblem?.number ?? 0) + 1;
    }
});

const Problem = mongoose.model<IProblem>("Problem", problemSchema)

export default Problem;