"""Regression checks for the systemd deployment unit."""

import unittest
from pathlib import Path


UNIT_PATH = Path(__file__).resolve().parents[1] / "deploy" / "clairkeys-omr.service"


class DeploymentUnitTests(unittest.TestCase):
    def test_cidfile_is_removed_before_podman_run(self):
        """A stale or concurrently removed cidfile must not fail a restart."""
        lines = UNIT_PATH.read_text(encoding="utf-8").splitlines()
        cleanup = "ExecStartPre=/bin/rm -f %t/%n.ctr-id"
        run_index = next(i for i, line in enumerate(lines) if line.startswith("ExecStart="))

        self.assertIn(cleanup, lines)
        self.assertLess(lines.index(cleanup), run_index)

