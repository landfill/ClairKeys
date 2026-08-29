/**
 * 제출 전 PDF 검사 (DS-3 '파일 거부').
 *
 * 이름과 크기만 보던 검사에 **파일 내용 검사**를 더한다. 이유는 두 가지다.
 *
 * - 확장자만 `.pdf`인 파일은 서버까지 가서야 거부되고, 그때는 이미 `SheetMusic` 행이 하나
 *   만들어진 뒤다 (`/api/omr/upload`는 행을 만든 다음 서비스를 호출한다).
 * - **암호가 걸린 PDF는 어느 쪽도 걸러내지 못했다.** Audiveris가 열지 못해 변환 실패로 끝나는데,
 *   사용자가 보는 것은 "악보를 읽지 못했습니다"뿐이라 암호가 원인이라는 것을 알 길이 없다.
 *   이건 몇 분 기다린 뒤의 변환 실패가 아니라 파일 선택 즉시 알 수 있는 것이다.
 *
 * 검사는 전부 브라우저 안에서 한다. 서버 검증을 대체하지 않으며(서버는 그대로 두었다), 사용자가
 * 헛되이 기다리는 시간을 없애는 것이 목적이다.
 */

export type PdfRejectionReason =
  | 'not-pdf'
  | 'empty'
  | 'too-large'
  | 'encrypted'
  | 'duplicate'
  | 'unreadable'

export type PdfInspection = { ok: true } | { ok: false; reason: PdfRejectionReason }

/** `/api/omr/upload`가 거부하는 경계와 같은 값이다. 한쪽만 바꾸지 않는다. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

/** `%PDF-` 헤더는 파일 앞 1KB 안에 있어야 한다 (PDF 명세가 허용하는 범위). */
const HEADER_WINDOW_BYTES = 1024

/**
 * 암호화 여부를 판정할 꼬리 구간.
 *
 * `/Encrypt`는 trailer 딕셔너리(또는 xref 스트림 딕셔너리)의 키이고 둘 다 파일 끝에 있다.
 * 파일 전체를 읽으면 50MB를 메모리에 올려야 하므로 꼬리만 본다.
 */
const TRAILER_WINDOW_BYTES = 64 * 1024

/** 같은 파일을 두 번 올리는 것을 알아보기 위한 식별자. 브라우저가 알려주는 것은 이 둘뿐이다. */
export function fileSignature(file: File): string {
  return `${file.name}:${file.size}`
}

function readBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'))
    reader.readAsArrayBuffer(blob)
  })
}

/** ASCII 패턴을 바이트 배열에서 찾는다. 디코딩하지 않으므로 인코딩 추측이 끼어들지 않는다. */
function containsAscii(haystack: Uint8Array, needle: string): boolean {
  const target = Array.from(needle, (character) => character.charCodeAt(0))
  if (target.length === 0 || haystack.length < target.length) return false

  outer: for (let start = 0; start <= haystack.length - target.length; start += 1) {
    for (let offset = 0; offset < target.length; offset += 1) {
      if (haystack[start + offset] !== target[offset]) continue outer
    }
    return true
  }
  return false
}

/**
 * 파일을 제출해도 되는지 판정한다.
 *
 * 값싼 검사(이름·크기·중복)를 먼저 하고 바이트는 그다음에 읽는다. 첫 판정 하나만 돌려주는 것은
 * 화면이 한 번에 한 가지 복구 행동만 제시하기 때문이다.
 */
export async function inspectPdfFile(
  file: File,
  options: { knownSignatures?: readonly string[] } = {}
): Promise<PdfInspection> {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { ok: false, reason: 'not-pdf' }
  }

  if (file.size === 0) {
    return { ok: false, reason: 'empty' }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'too-large' }
  }

  if (options.knownSignatures?.includes(fileSignature(file))) {
    return { ok: false, reason: 'duplicate' }
  }

  let header: Uint8Array
  let trailer: Uint8Array
  try {
    header = await readBytes(file.slice(0, HEADER_WINDOW_BYTES))
    trailer = await readBytes(file.slice(Math.max(0, file.size - TRAILER_WINDOW_BYTES)))
  } catch {
    return { ok: false, reason: 'unreadable' }
  }

  if (!containsAscii(header, '%PDF-')) {
    return { ok: false, reason: 'not-pdf' }
  }

  if (containsAscii(trailer, '/Encrypt')) {
    return { ok: false, reason: 'encrypted' }
  }

  return { ok: true }
}
