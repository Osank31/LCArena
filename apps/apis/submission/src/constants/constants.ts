function getEnvVariable(name: string, required = true): string {
  const value = process.env[name]

  if (required && (!value || value.trim() === "")) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value || ""
}

export const APP_PORT = getEnvVariable("PORT")
export const MONGODB_URL = getEnvVariable("MONGODB_URL")
export const PROBLEM_SERVICE_URL = getEnvVariable("PROBLEM_URL")