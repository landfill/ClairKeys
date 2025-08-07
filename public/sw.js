// ClairKeys Service Worker
// PWA 오프라인 지원 및 캐싱 전략 구현

const CACHE_NAME = 'clairkeys-v1.0.0'
const RUNTIME_CACHE = 'clairkeys-runtime-v1.0.0'

// 정적 리소스 캐싱 목록
const STATIC_CACHE_URLS = [
  '/',
  '/app/dashboard',
  '/app/browse',
  '/app/practice',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // 필수 스타일 및 스크립트
  '/_next/static/css/',
  '/_next/static/js/',
  // 오디오 리소스
  '/audio/piano/',
  // 폰트
  '/fonts/'
]

// 캐싱 전략별 URL 패턴
const CACHE_STRATEGIES = {
  // 캐시 우선 (Cache First) - 정적 리소스
  CACHE_FIRST: [
    /\/_next\/static\//,
    /\/fonts\//,
    /\/images\//,
    /\/icons\//,
    /\/audio\//,
    /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico)$/
  ],
  
  // 네트워크 우선 (Network First) - API 및 동적 콘텐츠
  NETWORK_FIRST: [
    /\/api\//,
    /\/upload/,
    /\/process/
  ],
  
  // 스테일 화일 리밸리데이션 (Stale While Revalidate) - 페이지
  STALE_WHILE_REVALIDATE: [
    /^https?:\/\/[^\/]+\/(?:app\/)?/,
    /\/dashboard/,
    /\/browse/,
    /\/practice/
  ]
}

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('ClairKeys SW: Installing...')
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME)
        
        // 기본 리소스 미리 캐싱
        const essentialUrls = [
          '/',
          '/offline',
          '/manifest.json'
        ]
        
        await cache.addAll(essentialUrls)
        console.log('ClairKeys SW: Pre-cached essential resources')
        
        // 즉시 활성화
        await self.skipWaiting()
      } catch (error) {
        console.error('ClairKeys SW: Installation failed', error)
      }
    })()
  )
})

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('ClairKeys SW: Activating...')
  
  event.waitUntil(
    (async () => {
      try {
        // 이전 캐시 정리
        const cacheNames = await caches.keys()
        const deletePromises = cacheNames
          .filter(name => name.startsWith('clairkeys-') && name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => caches.delete(name))
        
        await Promise.all(deletePromises)
        console.log('ClairKeys SW: Old caches cleaned up')
        
        // 모든 클라이언트에 즉시 적용
        await self.clients.claim()
      } catch (error) {
        console.error('ClairKeys SW: Activation failed', error)
      }
    })()
  )
})

// 네트워크 요청 가로채기 및 캐싱 전략 적용
self.addEventListener('fetch', (event) => {
  // POST 요청은 캐싱하지 않음
  if (event.request.method !== 'GET') return
  
  const url = new URL(event.request.url)
  
  // 외부 도메인은 처리하지 않음
  if (url.origin !== location.origin) return
  
  // 캐싱 전략 결정
  const strategy = determineStrategy(url.pathname)
  
  event.respondWith(
    handleRequest(event.request, strategy)
  )
})

// 캐싱 전략 결정 함수
function determineStrategy(pathname) {
  // Cache First 확인
  for (const pattern of CACHE_STRATEGIES.CACHE_FIRST) {
    if (pattern.test(pathname)) return 'cache-first'
  }
  
  // Network First 확인
  for (const pattern of CACHE_STRATEGIES.NETWORK_FIRST) {
    if (pattern.test(pathname)) return 'network-first'
  }
  
  // Stale While Revalidate 확인
  for (const pattern of CACHE_STRATEGIES.STALE_WHILE_REVALIDATE) {
    if (pattern.test(pathname)) return 'stale-while-revalidate'
  }
  
  // 기본 전략
  return 'network-first'
}

// 요청 처리 함수
async function handleRequest(request, strategy) {
  try {
    switch (strategy) {
      case 'cache-first':
        return await cacheFirst(request)
      
      case 'network-first':
        return await networkFirst(request)
      
      case 'stale-while-revalidate':
        return await staleWhileRevalidate(request)
      
      default:
        return await networkFirst(request)
    }
  } catch (error) {
    console.error('ClairKeys SW: Request handling failed', error)
    return await handleOffline(request)
  }
}

// Cache First 전략
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  
  if (cached) {
    return cached
  }
  
  try {
    const response = await fetch(request)
    
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    // 네트워크 오류시 오프라인 처리
    return await handleOffline(request)
  }
}

// Network First 전략
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  try {
    const response = await fetch(request)
    
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    const cached = await cache.match(request)
    
    if (cached) {
      return cached
    }
    
    return await handleOffline(request)
  }
}

// Stale While Revalidate 전략
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  
  // 백그라운드에서 업데이트
  const fetchPromise = (async () => {
    try {
      const response = await fetch(request)
      
      if (response.status === 200) {
        cache.put(request, response.clone())
      }
      
      return response
    } catch (error) {
      console.warn('ClairKeys SW: Background update failed', error)
      return null
    }
  })()
  
  // 캐시된 버전이 있으면 즉시 반환, 없으면 네트워크 대기
  return cached || await fetchPromise || await handleOffline(request)
}

// 오프라인 처리
async function handleOffline(request) {
  const url = new URL(request.url)
  
  // HTML 페이지 요청시 오프라인 페이지 반환
  if (request.destination === 'document') {
    const cache = await caches.open(CACHE_NAME)
    const offlinePage = await cache.match('/offline')
    
    if (offlinePage) {
      return offlinePage
    }
  }
  
  // 기본 오프라인 응답
  return new Response(
    JSON.stringify({ error: 'Offline', message: 'This content is not available offline' }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}

// 백그라운드 동기화 (푸시 알림용)
self.addEventListener('sync', (event) => {
  console.log('ClairKeys SW: Background sync triggered', event.tag)
  
  if (event.tag === 'practice-session-sync') {
    event.waitUntil(syncPracticeSessions())
  }
})

// 연습 세션 동기화
async function syncPracticeSessions() {
  try {
    // IndexedDB에서 대기 중인 연습 세션 데이터 가져오기
    const sessions = await getOfflinePracticeSessions()
    
    for (const session of sessions) {
      try {
        await fetch('/api/practice/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(session)
        })
        
        // 성공시 로컬 데이터 삭제
        await removeOfflinePracticeSession(session.id)
      } catch (error) {
        console.warn('ClairKeys SW: Failed to sync session', session.id, error)
      }
    }
    
    console.log('ClairKeys SW: Practice sessions synced successfully')
  } catch (error) {
    console.error('ClairKeys SW: Background sync failed', error)
  }
}

// 푸시 알림 처리 (선택사항)
self.addEventListener('push', (event) => {
  console.log('ClairKeys SW: Push message received', event)
  
  const options = {
    body: event.data?.text() || 'ClairKeys에서 새로운 업데이트가 있습니다!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'clairkeys-notification',
    data: {
      url: '/'
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('ClairKeys', options)
  )
})

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('ClairKeys SW: Notification clicked', event)
  
  event.notification.close()
  
  const targetUrl = event.notification.data?.url || '/'
  
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      // 기존 창이 열려있으면 포커스
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // 새 창 열기
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

// IndexedDB 헬퍼 함수들 (오프라인 데이터 저장)
async function getOfflinePracticeSessions() {
  // 실제 구현에서는 IndexedDB를 사용
  return []
}

async function removeOfflinePracticeSession(sessionId) {
  // 실제 구현에서는 IndexedDB에서 제거
  console.log('Remove offline session:', sessionId)
}

// 디버깅용 메시지 처리
self.addEventListener('message', (event) => {
  console.log('ClairKeys SW: Message received', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

console.log('ClairKeys Service Worker loaded successfully')