# 디자인 시스템 (PWA)

차량 앱(`wayfit-pleos-android/docs/DESIGN_SYSTEM.md`)과 **같은 원칙·같은 브랜드**를 쓴다.
다른 점은 테마 하나: PWA는 **매장 계산대의 밝은 조명에서 폰으로 보여주는 화면**이라 밝은 고대비 테마다.
토큰은 `src/index.css`의 `@theme` 한 곳에서 나온다 (Tailwind 클래스 `bg-brand`, `text-ink-2` …).

## 1. 색
| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `brand` / `on-brand` | `#2FD8A3` / `#032A1C` | 주요 버튼, 활성 탭, 사용 완료 화면 |
| `brand-strong` | `#0E8F67` | 흰 바탕 위 **브랜드 글자** (민트 원색은 흰 바탕 대비가 부족) |
| `brand-soft` | `#E3F8F0` | 브랜드를 옅게 깐 배지·알림 |
| `bg` / `surface` / `sunken` | `#F6F8F9` / `#FFFFFF` / `#EEF1F3` | 바탕 / 카드 / 입력·키패드 |
| `line` | `#DFE3E8` | 테두리 |
| `ink` / `ink-2` / `ink-3` | `#12161B` / `#4B5563` / `#8A93A0` | 본문 / 보조 / 라벨 |
| `amber` (+soft) | `#B26B00` | **오프라인·일시중지** 등 주의에서만 |
| `rose` (+soft) | `#D92D4B` | **오류·만료 임박·연결 해제**에서만 |

- 브랜드는 민트 하나. 중립은 Ink 하나. 앰버·로즈는 정해진 의미에서만.
- 사장님 웹의 **차량 화면 미리보기**만 예외로 차량 앱 다크 토큰을 그대로 쓴다 (실제와 같아 보여야 하므로).

## 2. 곡률
| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `rounded-sm` | 12px | 탭 안 버튼, 아이콘 타일, 시간 입력 |
| `rounded-btn` | 16px | 버튼, 입력창, 알림 줄 |
| `rounded-card` | 24px | 카드, 쿠폰 티켓, 바텀시트 |
| `rounded-full` | — | 배지, PIN 점 |

## 3. 깊이
`shadow-sm`(페이지에 붙은 카드)과 `shadow-lg`(바텀시트) 두 단계만.

## 4. 크기·간격
- 운전자 화면은 폰 기준 `max-w-md`, 사장님 웹은 `max-w-4xl`.
- 터치 영역 최소 44px. 주요 버튼 `h-14`, PIN 키패드 `h-16`.
- 계산대 화면: 혜택 34px Black, 쿠폰 코드 48px 모노스페이스 (Spec NFR-P4).

## 5. 타이포
Pretendard(가변) · 본문 16px. 한국어 줄바꿈은 `word-break: keep-all` (body 전역).

| 쓰임 | 클래스 |
|---|---|
| 화면 제목 | `text-2xl font-extrabold` |
| 카드 제목·혜택 | `text-xl font-extrabold` |
| 본문 | `text-base` |
| 보조·메타 | `text-sm text-ink-2` / `text-ink-3` |

## 6. 컴포넌트 (`src/ui`)
| 컴포넌트 | 용도 |
|---|---|
| `Button` | primary / secondary / ghost / danger, 누르면 0.97배. 한 화면에 primary 하나 |
| `Card` · `Badge` · `Skeleton` · `EmptyState` | 기본 면과 상태 |
| `Ticket` | 쿠폰 (점선 + 홈 + 코드 스텁) — 차량 앱 TicketCard 와 같은 모양 |
| `Sheet` | 모바일 바텀시트 / 넓은 화면 가운데 다이얼로그. 위험 동작 확인용 |
| `OfflineBanner` | 오프라인일 때 캐시를 보여주고 있다고 알림 |

화면에서 버튼·시트를 인라인으로 새로 만들지 않는다. 필요하면 `src/ui`에 추가한다.

## 7. 문구
- 해요체, 짧게. 오류는 **무슨 일이 있었는지 + 무엇을 하면 되는지**: "연결 코드가 만료됐어요. 차 화면에서 새 코드를 받아주세요"
- 백엔드 에러 코드 → 문장 변환은 `src/api/errors.ts` 한 곳에서.
