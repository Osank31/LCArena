import { getEnvVariable } from "@LCArena/utils";

export const APP_PORT = getEnvVariable("PORT")
export const PROBLEM_SERVICE_URL = getEnvVariable("PROBLEM_SERVICE_URL")
export const SUBMISSION_SERVICE_URL = getEnvVariable("SUBMISSION_SERVICE_URL")