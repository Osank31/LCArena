import {getEnvVariable} from "@LCArena/utils"

export const APP_PORT = getEnvVariable("PORT")
export const MONGODB_URL = getEnvVariable("MONGODB_URL")
export const MAIL_SERVICE_URL = getEnvVariable("MAIL_SERVICE_URL")
export const ACCESS_TOKEN_JWT_KEY = getEnvVariable("ACCESS_TOKEN_JWT_KEY")
export const REFRESH_TOKEN_JWT_KEY = getEnvVariable("REFRESH_TOKEN_JWT_KEY")
export const AWS_ACCESS_KEY = getEnvVariable("AWS_ACCESS_KEY")
export const AWS_SECRET_ACCESS_KEY = getEnvVariable("AWS_SECRET_ACCESS_KEY")