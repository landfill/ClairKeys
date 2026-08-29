import type { SheetMusicProvenance } from '@prisma/client'

interface DemoProvenanceNoticeProps {
  provenance: SheetMusicProvenance
}

export default function DemoProvenanceNotice({ provenance }: DemoProvenanceNoticeProps) {
  if (provenance !== 'demo') return null

  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="font-semibold">실제 악보 변환 결과가 아닙니다.</p>
      <p className="mt-1">
        이전 데모 업로드 경로에서 생성된 연습용 멜로디입니다. 원본 PDF의 음표를 인식한 결과로
        사용하지 마세요.
      </p>
    </div>
  )
}
