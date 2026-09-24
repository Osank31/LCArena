import {getEnvVariable} from "@LCArena/utils"

export const APP_PORT = getEnvVariable("PORT")
export const MONGODB_URL = getEnvVariable("MONGODB_URL")