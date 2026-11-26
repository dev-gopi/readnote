// Unit tests for AppError hierarchy
import { AppError, StorageError, ApiError, AuthError, ValidationError } from '../../src/shared/errors/AppError';

describe('AppError', () => {
  it('creates with default code and details', () => {
    const err = new AppError('Something went wrong');
    expect(err.message).toBe('Something went wrong');
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.details).toBeNull();
    expect(err.name).toBe('AppError');
    expect(err.timestamp).toBeTruthy();
  });

  it('toJSON() serialises correctly', () => {
    const err = new AppError('oops', 'MY_CODE', { foo: 'bar' });
    const json = err.toJSON();
    expect(json.code).toBe('MY_CODE');
    expect(json.details).toEqual({ foo: 'bar' });
  });
});

describe('StorageError', () => {
  it('has STORAGE_ERROR code', () => {
    expect(new StorageError('disk full').code).toBe('STORAGE_ERROR');
  });
});

describe('ApiError', () => {
  it('stores statusCode', () => {
    const err = new ApiError('Not found', 404);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('API_ERROR');
  });
});

describe('AuthError', () => {
  it('has AUTH_ERROR code', () => {
    expect(new AuthError('Unauthorized').code).toBe('AUTH_ERROR');
  });
});

describe('ValidationError', () => {
  it('stores field name', () => {
    const err = new ValidationError('Required', 'email');
    expect(err.field).toBe('email');
    expect(err.code).toBe('VALIDATION_ERROR');
  });
});
