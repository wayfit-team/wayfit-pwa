import type { ApiErrorBody } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** 네트워크 자체가 없을 때 (오프라인) */
export class OfflineError extends Error {
  constructor() {
    super('인터넷에 연결되어 있지 않아요')
  }
}

/** 백엔드 에러 코드 → 사용자에게 보여줄 문장. 문구 규칙은 docs/DESIGN_SYSTEM.md §7 */
const MESSAGES: Record<string, string> = {
  PAIRING_CODE_EXPIRED: '연결 코드가 만료됐어요. 차 화면에서 새 코드를 받아주세요',
  PAIRING_CODE_USED: '이미 사용된 연결 코드예요. 차 화면에서 새 코드를 받아주세요',
  NOT_FOUND: '찾을 수 없어요',
  UNAUTHORIZED: '다시 연결이 필요해요',
  PIN_INVALID: 'PIN이 맞지 않아요',
  PIN_LOCKED: '잠시 후 다시 시도해 주세요',
  COUPON_ALREADY_REDEEMED: '이미 사용된 쿠폰이에요',
  COUPON_EXPIRED: '사용 기간이 지난 쿠폰이에요',
  STORE_INACTIVE: '지금은 쿠폰을 받지 않는 매장이에요',
  VALIDATION_FAILED: '입력한 내용을 다시 확인해 주세요',
  LOGIN_FAILED: '이메일 또는 비밀번호가 맞지 않아요',
}

export function errorMessage(error: unknown): string {
  if (error instanceof OfflineError) return error.message
  if (error instanceof ApiError) return MESSAGES[error.code] ?? error.message
  return '잠시 후 다시 시도해 주세요'
}

export function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'error' in body
}
