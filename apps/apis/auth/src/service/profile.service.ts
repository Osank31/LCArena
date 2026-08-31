import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY } from "../constants/constants.js";
import crypto from "crypto";
import {UpdateUserRoleBody} from "../controllers/profile.contoroller.js";
import {User} from "@LCArena/models";
import {NotFoundError} from "@LCArena/utils";

const s3Client = new S3Client({
    region: "ap-south-1",
    credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
});

export const getPresignedUrl = async ({ mimeType }: { mimeType: string }) => {
    const extension = mimeType.split("/")[1] || "jpeg";
    const key = `profiles/${crypto.randomUUID()}.${extension}`;
    const bucket = "leetcode-clone-profiles";

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: mimeType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { url, key };
};

export const updateUserRole = async (data: UpdateUserRoleBody)=> {
    return User.findByIdAndUpdate(data.userId, {
        userType: data.userRole,
        roleExpiry: data.roleExpiry
    });
}