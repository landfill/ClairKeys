import Link from "next/link";
import PianoKeyboard from "@/components/piano/PianoKeyboard";
import { Container } from "@/components/layout";
import { Button, Card } from "@/components/ui";

export default function Home() {
  return (
    <div className="py-8">
      {/* Hero Section */}
      <section className="text-center py-16">
        <Container>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            <span className="text-blue-600">Clairkeys</span>로 시작하는<br />
            스마트 피아노 학습
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            악보를 읽을 줄 몰라도 괜찮습니다. PDF 악보를 업로드하면 시각적인 피아노 애니메이션으로 변환하여 쉽게 피아노를 배울 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/upload">
              <Button size="lg" className="w-full sm:w-auto">
                시작하기
              </Button>
            </Link>
            <Link href="/explore">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                공개 악보 탐색
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* Demo Piano */}
      <section className="py-16 bg-white">
        <Container size="full">
          <h2 className="text-2xl font-bold text-center mb-8">피아노 미리보기</h2>
          <div className="max-w-6xl mx-auto">
            <Card padding="lg" shadow="md">
              <div className="w-full overflow-x-auto">
                <PianoKeyboard className="min-w-[800px] w-full" height={180} />
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-16">
        <Container>
          <h2 className="text-3xl font-bold text-center mb-12">주요 기능</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2">PDF 업로드</h3>
              <p className="text-gray-600">
                PDF 악보를 업로드하면 자동으로 피아노 애니메이션 데이터로 변환됩니다.
              </p>
            </Card>
            <Card className="text-center">
              <div className="text-4xl mb-4">🎹</div>
              <h3 className="text-xl font-semibold mb-2">시각적 학습</h3>
              <p className="text-gray-600">
                피아노 건반 위에서 애니메이션을 보며 직관적으로 연주를 배울 수 있습니다.
              </p>
            </Card>
            <Card className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">맞춤형 학습</h3>
              <p className="text-gray-600">
                속도 조절, 따라하기 모드 등 개인의 학습 속도에 맞춰 연습할 수 있습니다.
              </p>
            </Card>
          </div>
        </Container>
      </section>
    </div>
  );
}