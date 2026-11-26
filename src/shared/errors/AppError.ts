// Custom error classes
export class AppError extends Error {
  public readonly code: string;
  public readonly details: unknown;
  public readonly timestamp: string;

  constructor(message: string, code = 'UNKNOWN_ERROR', details: unknown = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): {
    name: string;
    code: string;
    message: string;
    details: unknown;
    timestamp: string;
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

export class StorageError extends AppError {
  constructor(message: string, details: unknown = null) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
  }
}

export class ApiError extends AppError {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number, details: unknown = null) {
    super(message, 'API_ERROR', details);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export class AuthError extends AppError {
  constructor(message: string, details: unknown = null) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AppError {
  public readonly field: string;

  constructor(message: string, field: string, details: unknown = null) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    this.field = field;
  }
}
