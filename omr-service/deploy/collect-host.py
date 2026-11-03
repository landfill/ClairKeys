"""Run by the unprivileged host timer, never through a web request."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil


def collect(memory_path=Path('/proc/meminfo'), data_path='/data'):
    memory = {}
    for line in memory_path.read_text().splitlines():
        key, value = line.split(':', 1)
        if key in ('MemTotal', 'MemAvailable'):
            memory[key] = int(value.split()[0]) * 1024
    disk = shutil.disk_usage(data_path)
    return dict(sampled_at=datetime.now(timezone.utc).isoformat(),
        memory_total_bytes=memory['MemTotal'], memory_available_bytes=memory['MemAvailable'],
        data_total_bytes=disk.total, data_free_bytes=disk.free)


if __name__ == '__main__':
    directory = Path(os.environ.get('STATE_DIRECTORY', '/var/lib/clairkeys-omr-monitor'))
    target = directory / 'host.json'
    temporary = directory / 'host.json.tmp'
    temporary.write_text(json.dumps(collect()), encoding='utf-8')
    temporary.chmod(0o644)
    temporary.replace(target)
