function getEnvVariable(name: string, required = true): string {
  const value = process.env[name]

  if (required && (!value || value.trim() === "")) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value || ""
}

export const APP_PORT = getEnvVariable("PORT")
export const SUBMISSION_SERVICE_URL = getEnvVariable("SUBMISSION_URL")