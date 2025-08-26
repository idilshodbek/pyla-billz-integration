export abstract class HttpException extends Error {
  public status: number;
  public message: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }

  public toJson(): any {
    return {
      status: this.status,
      message: this.message,
    };
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class AuthenticationTimeoutException extends HttpException {
  constructor(message: string = 'Authentication Timeout') {
    super(419, message);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = 'Not Found') {
    super(404, message);
  }
}

export class ConflictException extends HttpException {
  constructor(message: string = 'Conflict Error') {
    super(409, message);
  }
}

export class InternalServerException extends HttpException {
  constructor(message: string = 'Internal Server Error') {
    super(500, message);
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(message: string = 'Too Many Requests') {
    super(429, message);
  }
}

export class UnprocessableException extends HttpException {
  constructor(message: string = 'Unprocessable Entity') {
    super(422, message);
  }
}
