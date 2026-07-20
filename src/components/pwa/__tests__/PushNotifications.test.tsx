import { renderHook, waitFor } from '@testing-library/react'

import { usePushNotifications } from '../PushNotifications'

describe('usePushNotifications', () => {
  const originalNotification = Object.getOwnPropertyDescriptor(window, 'Notification')
  const originalPushManager = Object.getOwnPropertyDescriptor(window, 'PushManager')
  const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

  afterEach(() => {
    restoreProperty(window, 'Notification', originalNotification)
    restoreProperty(window, 'PushManager', originalPushManager)
    restoreProperty(navigator, 'serviceWorker', originalServiceWorker)
  })

  it('reflects an existing browser push subscription after mount', async () => {
    const existingSubscription = {} as PushSubscription
    const getSubscription = jest.fn(async () => existingSubscription)

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'granted',
        requestPermission: jest.fn(),
      },
    })
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: function PushManager() {},
    })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: { getSubscription },
        }),
      },
    })

    const { result } = renderHook(() => usePushNotifications())

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true)
      expect(result.current.permission).toBe('granted')
      expect(result.current.isSubscribed).toBe(true)
    })

    expect(getSubscription).toHaveBeenCalledTimes(1)
  })
})

function restoreProperty(
  target: Window | Navigator,
  property: 'Notification' | 'PushManager' | 'serviceWorker',
  descriptor: PropertyDescriptor | undefined
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor)
  } else {
    Reflect.deleteProperty(target, property)
  }
}
