import Link from 'next/link'
import { Container } from '@/components/layout'
import { Button } from '@/components/ui'
import HomeSamplePlayer from '@/components/home/HomeSamplePlayer'

/**
 * 로그인 전 방문자가 "내 PDF가 무엇이 되는지"를 첫 화면에서 보게 한다 (DS-2).
 *
 * 이전 홈은 정지한 건반 그림과 기능 카드 세 장이었다. 그것은 이 앱이 무엇을 하는지가 아니라 무엇을
 * 가졌는지를 말한다. 히어로에는 실제로 움직이는 결과를 둔다.
 */
export default function Home() {
  return (
    <div>
      <section className="pt-14 pb-10">
        <Container>
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-ink leading-tight">
              가지고 있는 PDF 악보를
              <br />
              따라 치기 쉬운 연습으로
            </h1>
            <p className="mt-5 text-lg text-ink-muted max-w-xl">
              악보를 읽지 못해도 괜찮습니다. 노트가 건반으로 떨어지는 것을 보고 그대로 누르면 됩니다.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
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
              업로드를 누르기 전에 알아야 할 것을 CTA 옆에 둔다. 업로드 화면까지 가서야 50MB
              제한이나 처리 시간을 알게 되면 그때 되돌아 나온다.
            */}
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
              <li>PDF 파일, 최대 50MB</li>
              <li>변환에 1~3분</li>
              <li>내 악보는 나에게만 보입니다</li>
            </ul>
          </div>
        </Container>
      </section>

      <section className="pb-16">
        <Container>
          <HomeSamplePlayer />
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-ink-muted mb-6">
            어떻게 되나요
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              { step: '1', title: 'PDF 악보를 올립니다', body: '가지고 있는 악보 파일을 그대로 올리면 됩니다.' },
              { step: '2', title: 'AI가 음표를 읽습니다', body: '1~3분이 걸리고, 그동안 페이지를 닫아도 됩니다.' },
              { step: '3', title: '보면서 연습합니다', body: '노트가 건반으로 떨어집니다. 속도를 늦춰 따라갈 수 있습니다.' },
            ].map((item) => (
              <li key={item.step} className="border-t border-rule pt-4">
                <span className="text-sm font-mono text-accent">{item.step}</span>
                <h3 className="mt-2 text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </div>
  )
}
