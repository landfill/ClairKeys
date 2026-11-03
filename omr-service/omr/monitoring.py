"""Read-only, process-local observations. No source payload or exception text."""
from collections import deque
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
from time import monotonic

MAX_COMPLETED = 100
RETENTION_SECONDS = 3600
HOST_MAX_AGE_SECONDS = 90


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def host_snapshot(path):
    empty = dict(status='unavailable', sampled_at=None, memory_total_bytes=None,
                 memory_available_bytes=None, data_total_bytes=None, data_free_bytes=None)
    try:
        # A read-only mount of a small atomic file; never a host socket or /proc mount.
        if path.stat().st_size > 4096:
            return empty
        raw = json.loads(path.read_text(encoding='utf-8'))
        sampled = datetime.fromisoformat(raw['sampled_at'])
        age = (datetime.now(timezone.utc) - sampled).total_seconds()
        values = {key: raw[key] for key in empty if key not in ('status', 'sampled_at')}
        if age < -5 or not all(type(value) is int and value >= 0 for value in values.values()):
            return empty
        if (values['memory_total_bytes'] <= 0 or values['data_total_bytes'] <= 0
                or values['memory_available_bytes'] > values['memory_total_bytes']
                or values['data_free_bytes'] > values['data_total_bytes']):
            return empty
        return dict(status='stale' if age > HOST_MAX_AGE_SECONDS else 'ok',
                    sampled_at=sampled.isoformat(), **values)
    except (OSError, ValueError, TypeError, KeyError, OverflowError):
        return empty


class Monitor:
    def __init__(self, clock=monotonic, host_path=None):
        self.clock = clock
        self.started = clock()
        self.started_at = utc_now()
        self.active = {}
        self.completed = deque(maxlen=MAX_COMPLETED)
        self.host_path = host_path or Path('/run/clairkeys-monitor/host.json')

    def update(self, event, job_id, value=None):
        now = self.clock()
        if event == 'accepted':
            self.active[job_id] = dict(id=job_id, status='pending', stage='queued',
                created_at=utc_now(), updated_at=utc_now(), wait_seconds=None,
                callback=dict(status='not_started', attempts=0), _wait_start=now)
            return
        row = self.active.get(job_id)
        if row is None:
            return
        row['updated_at'] = utc_now()
        if event == 'stage' and value in ('save_pdf', 'audiveris_wait', 'audiveris', 'xml_to_json'):
            row['stage'] = value
            row['status'] = 'processing'
            if value == 'audiveris_wait':
                row['_wait_start'] = now
            elif value == 'audiveris':
                row['wait_seconds'] = max(0, now - row['_wait_start'])
        elif event == 'completed':
            row['status'] = 'completed'
            row['stage'] = 'callback'
            row['callback']['status'] = 'pending'
        elif event == 'failed':
            row['status'] = 'failed'
            self._finish(job_id, now)
        elif event == 'callback_attempt':
            row['callback']['attempts'] += 1
            row['callback']['status'] = 'pending'
        elif event == 'callback' and value in ('retrying', 'delivered', 'failed', 'exhausted'):
            row['callback']['status'] = value
            if value != 'retrying':
                self._finish(job_id, now)

    def _finish(self, job_id, now):
        row = self.active.pop(job_id)
        row['_finished'] = now
        self.completed.append(row)

    def snapshot(self):
        now = self.clock()
        while self.completed and now - self.completed[0]['_finished'] > RETENTION_SECONDS:
            self.completed.popleft()
        rows = list(self.active.values()) + list(self.completed)
        waiting = [row for row in self.active.values() if row['stage'] in ('queued', 'audiveris_wait')]
        recent = sorted(rows, key=lambda row: row['updated_at'], reverse=True)[:100]
        sha = os.getenv('OMR_DEPLOYMENT_SHA', '')
        return dict(version=1, sampled_at=utc_now(),
            deployment_sha=sha if re.fullmatch(r'[0-9a-f]{40}', sha) else None,
            started_at=self.started_at, uptime_seconds=max(0, now - self.started),
            retention=dict(max_completed=MAX_COMPLETED, seconds=RETENTION_SECONDS),
            jobs=dict(queued=len(waiting),
                processing=sum(row['status'] == 'processing' and row['stage'] != 'audiveris_wait' for row in self.active.values()),
                callback_pending=sum(row['status'] == 'completed' for row in self.active.values()),
                completed=sum(row['status'] == 'completed' for row in rows),
                failed=sum(row['status'] == 'failed' for row in rows),
                oldest_wait_seconds=max((now - row['_wait_start'] for row in waiting), default=0),
                recent=[{key: value for key, value in row.items() if not key.startswith('_')} for row in recent]),
            host=host_snapshot(self.host_path))


monitor = Monitor()


def observe(event, job_id, value=None):
    """Telemetry cannot fail a conversion, even if the collector itself fails."""
    try:
        monitor.update(event, job_id, value)
    except Exception:
        pass
