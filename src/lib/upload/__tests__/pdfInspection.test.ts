/**
 * 제출 전 PDF 검사.
 *
 * 이 파일의 fixture는 전부 **실제 바이트**다. 문자열 이름만 가진 가짜 File을 쓰면 내용 검사가
 * 무엇을 하는지 검증할 수 없고, 그런 가짜는 `jest.setup.js`에 실제로 있었다 — `slice`도
 * `arrayBuffer`도 없는 File 대역이라 바이트를 읽는 코드는 애초에 테스트할 수 없었다. 그 대역을
 * 걷어내고 jsdom의 진짜 File을 쓴다.
 */
import { fileSignature, inspectPdfFile, MAX_UPLOAD_BYTES } from '../pdfInspection'

/** jsdom 환경에는 `TextEncoder`가 없다. fixture가 ASCII뿐이라 직접 만든다. */
function ascii(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(text, (character) => character.charCodeAt(0))
}

/** 최소한의 유효 PDF: 헤더 + 본문 + trailer. */
function pdfSource({ encrypted = false, header = '%PDF-1.7\n' } = {}): string {
  const trailer = encrypted
    ? 'trailer\n<< /Size 6 /Root 1 0 R /Encrypt 5 0 R >>\nstartxref\n0\n%%EOF\n'
    : 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF\n'
  const body = '1 0 obj\n<< /Type /Catalog >>\nendobj\n'
  return `${header}${body}${trailer}`
}

function pdfBytes(options?: { encrypted?: boolean; header?: string }): Uint8Array<ArrayBuffer> {
  return ascii(pdfSource(options))
}

function pdfFile(bytes: Uint8Array<ArrayBuffer>, name = 'score.pdf', lastModified = 1_700_000_000_000): File {
  return new File([bytes], name, { type: 'application/pdf', lastModified })
}

describe('inspectPdfFile', () => {
  it('통과시킨 파일은 PDF 헤더를 갖고 암호가 걸려 있지 않다', async () => {
    // 계약을 직접 거는 불변식. 금지 목록을 베낀 것이 아니라 "통과한 것이 무엇인지"를 건다.
    const source = pdfSource()
    const result = await inspectPdfFile(pdfFile(ascii(source)))

    expect(result).toEqual({ ok: true })

    expect(source.startsWith('%PDF-')).toBe(true)
    expect(source).not.toContain('/Encrypt')
  })

  it('확장자가 PDF가 아니면 거부한다', async () => {
    const file = new File([pdfBytes()], 'score.png', { type: 'image/png' })
    await expect(inspectPdfFile(file)).resolves.toEqual({ ok: false, reason: 'not-pdf' })
  })

  it('확장자만 .pdf인 파일을 거부한다', async () => {
    // 서버까지 가면 이미 SheetMusic 행이 하나 만들어진 뒤에 거부된다.
    const notPdf = ascii('\x89PNG\r\n\x1a\n' + 'x'.repeat(200))
    await expect(inspectPdfFile(pdfFile(notPdf, 'renamed.pdf'))).resolves.toEqual({
      ok: false,
      reason: 'not-pdf',
    })
  })

  it('암호가 걸린 PDF를 제출 전에 잡아낸다', async () => {
    // 이걸 통과시키면 사용자는 몇 분을 기다린 뒤 "악보를 읽지 못했습니다"만 보게 되고,
    // 원인이 암호라는 것을 알 방법이 없다.
    await expect(inspectPdfFile(pdfFile(pdfBytes({ encrypted: true })))).resolves.toEqual({
      ok: false,
      reason: 'encrypted',
    })
  })

  it('빈 파일을 거부한다', async () => {
    await expect(inspectPdfFile(pdfFile(new Uint8Array(0)))).resolves.toEqual({
      ok: false,
      reason: 'empty',
    })
  })

  it('50MB를 넘는 파일을 거부한다', async () => {
    const oversized = { name: 'big.pdf', size: MAX_UPLOAD_BYTES + 1 } as File
    await expect(inspectPdfFile(oversized)).resolves.toEqual({ ok: false, reason: 'too-large' })
  })

  it('경계값인 50MB 정각은 통과시킨다', async () => {
    // 서버의 거부 조건도 `> 50MB`다. 한쪽만 엄격하면 화면과 서버가 다른 말을 한다.
    const bytes = pdfBytes()
    const exact = pdfFile(bytes)
    Object.defineProperty(exact, 'size', { value: MAX_UPLOAD_BYTES })

    await expect(inspectPdfFile(exact)).resolves.toEqual({ ok: true })
  })

  it('이 화면에서 이미 변환 중인 파일을 중복으로 알아본다', async () => {
    const file = pdfFile(pdfBytes())
    await expect(
      inspectPdfFile(file, { knownSignatures: [fileSignature(file)] })
    ).resolves.toEqual({ ok: false, reason: 'duplicate' })
  })

  it('이름이 같아도 크기가 다르면 중복이 아니다', async () => {
    const file = pdfFile(pdfBytes())
    const other = pdfFile(pdfBytes({ header: '%PDF-1.4\n\n' }))
    expect(other.size).not.toBe(file.size)

    await expect(
      inspectPdfFile(file, { knownSignatures: [fileSignature(other)] })
    ).resolves.toEqual({ ok: true })
  })

  it('이름과 크기가 같아도 다른 파일이면 중복이 아니다', async () => {
    // `name:size`만으로는 파일을 특정하지 못한다. 같은 이름·크기의 다른 악보를 골랐을 때
    // "이미 올린 파일입니다"로 막으면, 사용자는 올릴 방법이 없는 파일을 손에 쥐게 된다.
    const first = pdfFile(pdfBytes(), 'score.pdf', 1_700_000_000_000)
    const second = pdfFile(pdfBytes(), 'score.pdf', 1_700_000_999_000)
    expect(first.size).toBe(second.size)

    await expect(
      inspectPdfFile(second, { knownSignatures: [fileSignature(first)] })
    ).resolves.toEqual({ ok: true })
  })

  it('같은 파일을 다시 고르면 여전히 중복이다', async () => {
    // 브라우저가 같은 파일을 다시 넘겨줄 때 `lastModified`는 그대로다.
    const file = pdfFile(pdfBytes(), 'score.pdf', 1_700_000_000_000)
    const sameFileAgain = pdfFile(pdfBytes(), 'score.pdf', 1_700_000_000_000)

    await expect(
      inspectPdfFile(sameFileAgain, { knownSignatures: [fileSignature(file)] })
    ).resolves.toEqual({ ok: false, reason: 'duplicate' })
  })

  it('파일을 읽지 못하면 실패가 아니라 읽기 실패로 알린다', async () => {
    const unreadable = {
      name: 'gone.pdf',
      size: 128,
      slice: () => {
        throw new DOMException('NotFoundError')
      },
    } as unknown as File

    await expect(inspectPdfFile(unreadable)).resolves.toEqual({ ok: false, reason: 'unreadable' })
  })
})
