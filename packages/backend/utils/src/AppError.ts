export class AppError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode: number, name: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string, statusCode = 500, name = "Internal Server Error") {
        super(message, statusCode, name);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string, statusCode = 400, name = "BadRequestError") {
        super(message, statusCode, name);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string, statusCode = 404, name = "NotFoundError") {
        super(message, statusCode, name);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string, statusCode = 401, name = "Unauthorized Error") {
        super(message, statusCode, name);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string, statusCode = 403, name = "ForbiddenError") {
        super(message, statusCode, name);
    }
}

export class ConflictError extends AppError {
    constructor(message: string, statusCode = 409, name = "ConflictError") {
        super(message, statusCode, name);
    }
}

export class NotImplementedError extends AppError {
    constructor(message: string, statusCode = 501, name = "NotImplementedError") {
        super(message, statusCode, name);
    }
}