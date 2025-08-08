/**
 * Service Worker for Advanced Caching Strategy
 * Implements cache-first, network-first, and stale-while-revalidate strategies
 */

const CACHE_NAME = 'clairkeys-v1'
const STATIC_CACHE = 'clairkeys-static-v1'
const API_CACHE = 'clairkeys-api-v1'
const ANIMATION_CACHE = 'clairkeys-animation-v1'

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only'
}

// Route patterns and their caching strategies
const ROUTE_PATTERNS = [
  // Static assets - Cache first (long-term cache)
  {
    pattern: /\.(js|css|woff|woff2|ttf|eot|ico|png|jpg|jpeg|gif|webp|svg)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: STATIC_CACHE,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 100
  },
  
  // Next.js static files
  {
    pattern: /^\/_next\/static\//,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: STATIC_CACHE,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 50
  },
  
  // API routes - Network first with fallback
  {
    pattern: /^\/api\/categories/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: API_CACHE,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 20
  },
  
  {
    pattern: /^\/api\/sheet\/public/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: API_CACHE,
    maxAge: 10 * 60 * 1000, // 10 minutes
    maxEntries: 50
  },
  
  // Animation data - Cache first (large files)
  {
    pattern: /^\/api\/files\//,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: ANIMATION_CACHE,
    maxAge: 60 * 60 * 1000, // 1 hour
    maxEntries: 30
  },
  
  // HTML pages - Network first
  {
    pattern: /^\/(?!api)/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: CACHE_NAME,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 20
  }
]

// Install event - Cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        // Add other essential resources here
      ]).catch((error) => {
        console.warn('Failed to cache some resources during install:', error)
      })
    })
  )
  
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== ANIMATION_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Clean up expired entries
      cleanupExpiredEntries()
    ])
  )
  
  // Take control of all clients
  self.clients.claim()
})

// Fetch event - Apply caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Find matching route pattern
  const route = findMatchingRoute(url.pathname)
  
  if (route) {
    event.respondWith(handleRequest(request, route))
  }
})

// Find matching route pattern
function findMatchingRoute(pathname) {
  return ROUTE_PATTERNS.find(route => route.pattern.test(pathname))
}

// Handle request based on caching strategy
async function handleRequest(request, route) {
  const { strategy, cacheName, maxAge } = route
  
  try {
    switch (strategy) {
      case CACHE_STRATEGIES.CACHE_FIRST:
        return await cacheFirst(request, cacheName, maxAge)
      
      case CACHE_STRATEGIES.NETWORK_FIRST:
        return await networkFirst(request, cacheName, maxAge)
      
      case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
        return await staleWhileRevalidate(request, cacheName, maxAge)
      
      case CACHE_STRATEGIES.NETWORK_ONLY:
        return await fetch(request)
      
      default:
        return await fetch(request)
    }
  } catch (error) {
    console.error('Request handling error:', error)
    return new Response('Network error', { status: 503 })
  }
}

// Cache-first strategy
async function cacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Add timestamp header for expiration checking
      const responseToCache = networkResponse.clone()
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cached-at', Date.now().toString())
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      })
      
      cache.put(request, modifiedResponse)
    }
    
    return networkResponse
  } catch (error) {
    // Return stale cache if network fails
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Network-first strategy
async function networkFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName)
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const responseToCache = networkResponse.clone()
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cached-at', Date.now().toString())
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      })
      
      cache.put(request, modifiedResponse)
    }
    
    return networkResponse
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  // Always try to fetch fresh data in background
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone()
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cached-at', Date.now().toString())
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      })
      
      cache.put(request, modifiedResponse)
    }
    return networkResponse
  }).catch((error) => {
    console.warn('Background fetch failed:', error)
  })
  
  // Return cached response immediately if available
  if (cachedResponse) {
    // Don't await the fetch promise - let it run in background
    fetchPromise
    return cachedResponse
  }
  
  // If no cache, wait for network
  try {
    return await fetchPromise
  } catch (error) {
    return new Response('Network error', { status: 503 })
  }
}

// Check if cached response is expired
function isExpired(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at')
  if (!cachedAt) return true
  
  const age = Date.now() - parseInt(cachedAt)
  return age > maxAge
}

// Clean up expired entries from all caches
async function cleanupExpiredEntries() {
  const cacheNames = await caches.keys()
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()
    
    for (const request of requests) {
      const response = await cache.match(request)
      if (response) {
        // Find route config for this request
        const url = new URL(request.url)
        const route = findMatchingRoute(url.pathname)
        
        if (route && isExpired(response, route.maxAge)) {
          console.log('Removing expired cache entry:', request.url)
          await cache.delete(request)
        }
      }
    }
    
    // Limit cache size
    await limitCacheSize(cache, cacheName)
  }
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cache, cacheName) {
  const route = ROUTE_PATTERNS.find(r => r.cacheName === cacheName)
  if (!route || !route.maxEntries) return
  
  const requests = await cache.keys()
  
  if (requests.length > route.maxEntries) {
    // Sort by cached timestamp (oldest first)
    const requestsWithTime = await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request)
        const cachedAt = response?.headers.get('sw-cached-at') || '0'
        return { request, cachedAt: parseInt(cachedAt) }
      })
    )
    
    requestsWithTime.sort((a, b) => a.cachedAt - b.cachedAt)
    
    // Remove oldest entries
    const toRemove = requestsWithTime.slice(0, requests.length - route.maxEntries)
    for (const { request } of toRemove) {
      await cache.delete(request)
    }
  }
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { type, payload } = event.data
  
  switch (type) {
    case 'CLEAR_CACHE':
      clearCache(payload.cacheName).then(() => {
        event.ports[0].postMessage({ success: true })
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message })
      })
      break
      
    case 'GET_CACHE_STATS':
      getCacheStats().then((stats) => {
        event.ports[0].postMessage({ success: true, stats })
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message })
      })
      break
      
    default:
      console.warn('Unknown message type:', type)
  }
})

// Clear specific cache
async function clearCache(cacheName) {
  if (cacheName) {
    return await caches.delete(cacheName)
  } else {
    // Clear all caches
    const cacheNames = await caches.keys()
    return await Promise.all(cacheNames.map(name => caches.delete(name)))
  }
}

// Get cache statistics
async function getCacheStats() {
  const cacheNames = await caches.keys()
  const stats = {}
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()
    stats[cacheName] = requests.length
  }
  
  return stats
}