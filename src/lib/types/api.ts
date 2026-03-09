export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorDetails;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T): ApiSuccess<T> {
  return {
    success: true,
    data,
  };
}

export function err(code: string, message: string, details?: unknown): ApiFailure {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}
