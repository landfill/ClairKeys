/**
 * 로그인 화면의 제목과 이유는 돌아갈 경로의 여정을 따른다.
 *
 * 업로드 여정의 다음 단계로 읽히도록 만든 문구(DS-2)가 `/library`나 악보 연습 복귀에도 그대로
 * 나와, 내 악보를 열려던 사람에게 "악보를 맡기기 전에"라고 말했다.
 */
export interface SigninCopy {
  title: string
  reasons: string[]
}

const matches = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)

export function getSigninCopy(returnPath: string): SigninCopy {
  if (matches(returnPath, '/upload')) {
    return {
      title: '악보를 맡기기 전에 로그인해 주세요',
      reasons: [
        '변환한 악보를 계정에 저장해 다음에 다시 찾을 수 있습니다.',
        '변환은 1~3분 걸립니다. 페이지를 닫아도 계속 처리됩니다.',
        '내 악보는 공개로 설정하기 전까지 나에게만 보입니다.',
      ],
    }
  }

  if (matches(returnPath, '/library')) {
    return {
      title: '내 악보를 보려면 로그인해 주세요',
      reasons: [
        '올린 악보와 변환 중인 악보를 한곳에서 볼 수 있습니다.',
        '내 악보는 공개로 설정하기 전까지 나에게만 보입니다.',
      ],
    }
  }

  if (matches(returnPath, '/sheet')) {
    return {
      title: '이 곡을 이어서 연습하려면 로그인해 주세요',
      reasons: [
        '로그인하면 이 곡으로 바로 돌아옵니다.',
        '내 악보를 올려 같은 화면에서 연습할 수 있습니다.',
      ],
    }
  }

  return {
    title: 'ClairKeys에 로그인해 주세요',
    reasons: [
      '가지고 있는 PDF 악보를 올려 따라 치기 쉬운 연습으로 바꿀 수 있습니다.',
      '내 악보는 공개로 설정하기 전까지 나에게만 보입니다.',
    ],
  }
}
