import mongoose, {
    Schema,
    HydratedDocument,
    Model,
    Document
} from "mongoose";
import bcrypt from "bcrypt";

export enum UserType {
    Regular = "Regular",
    Admin = "Admin",
    Premium = "Premium",
}

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    profilePicUrl: string;
    userType: UserType;
    roleExpiry: Date | null;
    resetPasswordToken: string;
    resetTokenExpiry: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserMethods {
    comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        profilePicUrl: {
            type: String,
            default: "/default-url",
            required: true,
        },
        userType: {
            type: String,
            enum: Object.values(UserType),
            default: UserType.Regular,
            required: true,
        },
        roleExpiry: {
            type: Date,
            default: null,
        },
        resetPasswordToken: {
            type: String,
        },
        resetTokenExpiry: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (
    this: HydratedDocument<IUser>
) {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (
    candidatePassword: string
) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser, UserModel>(
    "User",
    userSchema
);

export default User;