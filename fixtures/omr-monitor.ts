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
