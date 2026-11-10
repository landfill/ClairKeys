/** Non-sensitive contract fixture for unit and browser tests. */
export const snapshotFixture = () => ({
  version: 1, sampled_at: new Date().toISOString(), started_at: new Date().toISOString(),
  uptime_seconds: 12, deployment_sha: 'a'.repeat(40), retention: { max_completed: 100, seconds: 3600 },
  jobs: { queued: 1, processing: 0, callback_pending: 0, completed: 0, failed: 0, oldest_wait_seconds: 2,
    recent: [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', status: 'pending', stage: 'queued',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), wait_seconds: null,
      callback: { status: 'not_started', attempts: 0 } }] },
  host: { status: 'unavailable', sampled_at: null, memory_total_bytes: null,
    memory_available_bytes: null, data_total_bytes: null, data_free_bytes: null },
})

export const healthySnapshotFixture = () => {
  const snapshot = snapshotFixture()
  const sampledAt = new Date().toISOString()
  return {
    ...snapshot,
    jobs: {
      ...snapshot.jobs, queued: 0, processing: 1, completed: 3, failed: 0, oldest_wait_seconds: 0,
      recent: [
        {
          id: '11111111-aaaa-bbbb-cccc-222222222222', status: 'processing', stage: 'audiveris',
          created_at: sampledAt, updated_at: sampledAt, wait_seconds: 2,
          callback: { status: 'not_started', attempts: 0 },
        },
        {
          id: '33333333-aaaa-bbbb-cccc-444444444444', status: 'completed', stage: 'callback',
          created_at: sampledAt, updated_at: sampledAt, wait_seconds: 1,
          callback: { status: 'delivered', attempts: 1 },
        },
      ],
    },
    host: {
      status: 'ok', sampled_at: sampledAt,
      memory_total_bytes: 16 * 1024 ** 3, memory_available_bytes: 12 * 1024 ** 3,
      data_total_bytes: 100 * 1024 ** 3, data_free_bytes: 75 * 1024 ** 3,
    },
  }
}
