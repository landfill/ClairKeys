import Link from 'next/link'
import { Container } from '@/components/layout'
import { Button } from '@/components/ui'
import HomeSamplePlayer from '@/components/home/HomeSamplePlayer'
import { MAX_UPLOAD_MB } from '@/lib/upload/pdfInspection'

const STEPS = [
  { step: '1', title: 'PDF 악보를 올립니다', body: '가지고 있는 악보 파일을 그대로.' },
  { step: '2', title: 'AI가 음표를 읽습니다', body: '1~3분. 페이지를 닫아도 됩니다.' },
  { step: '3', title: '보면서 연습합니다', body: '속도를 늦춰 따라갈 수 있습니다.' },
]

/**
 * 로그인 전 방문자가 "내 PDF가 무엇이 되는지"를 **최초 뷰포트 안에서** 보게 한다 (DS-2).
 *
 * 첫 판은 세로로 쌓았다가 실패했다. 히어로(약 450px) 다음에 플레이어가 오는데 플레이어는 컨트롤만
 * 300px 남짓이라, 정작 보여줘야 할 낙하 노트와 건반이 1440×900에서 화면 밖으로 밀렸다. 컨트롤을
 * 줄이는 것은 DS-5 소유이므로 여기서 할 수 있는 것은 배치다 — 데스크톱에서 두 단으로 나눠 플레이어가
 * 화면 위쪽에서 시작하게 한다.
 */
export default function Home() {
  return (
    <div>
      <section className="pt-10 pb-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12 lg:items-start">
            <div>
              <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight text-ink leading-tight">
                가지고 있는 PDF 악보를
                <br />
                따라 치기 쉬운 연습으로
              </h1>
              <p className="mt-4 text-base text-ink-muted">
                악보를 읽지 못해도 괜찮습니다. 노트가 건반으로 떨어지는 것을 보고 그대로 누르면 됩니다.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3">
                <Link href="/upload">
                  <Button size="lg" className="w-full sm:w-auto">
                    내 악보로 시작하기
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    공개 악보 탐색
                  </Button>
                </Link>
              </div>

              {/*
                업로드를 누르기 전에 알아야 할 것을 CTA 옆에 둔다. 업로드 화면까지 가서야 크기
                제한이나 처리 시간을 알게 되면 그때 되돌아 나온다.
              */}
              <ul className="mt-4 space-y-1 text-sm text-ink-muted">
                <li>PDF 파일, 최대 {MAX_UPLOAD_MB}MB</li>
                <li>변환에 1~3분, 페이지를 닫아도 계속됩니다</li>
                <li>공개로 설정하기 전까지 목록에 노출되지 않습니다</li>
              </ul>

              <h2 className="mt-8 text-xs font-semibold tracking-wide uppercase text-ink-muted">
                어떻게 되나요
              </h2>
              <ol className="mt-3 space-y-2">
                {STEPS.map((item) => (
                  <li key={item.step} className="flex gap-3 border-t border-rule pt-2">
                    <span className="text-sm font-mono text-accent shrink-0">{item.step}</span>
                    <span>
                      <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                      <p className="text-sm text-ink-muted">{item.body}</p>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <HomeSamplePlayer />
          </div>
        </Container>
      </section>
    </div>
  )
}
