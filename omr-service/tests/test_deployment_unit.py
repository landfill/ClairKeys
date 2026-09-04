"""Regression checks for the systemd deployment unit."""

import re
import unittest
from pathlib import Path


UNIT_PATH = Path(__file__).resolve().parents[1] / "deploy" / "clairkeys-omr.service"


def _exec_start_block(lines):
    """Return the ExecStart= directive with its line continuations joined."""
    start = next(i for i, line in enumerate(lines) if line.startswith("ExecStart="))
    block = []
    for line in lines[start:]:
        block.append(line)
        if not line.rstrip().endswith("\\"):
            break
    return "\n".join(block)


class DeploymentUnitTests(unittest.TestCase):
    def test_cidfile_is_removed_before_podman_run(self):
        """A cidfile surviving an unclean shutdown must not fail the next start."""
        lines = UNIT_PATH.read_text(encoding="utf-8").splitlines()
        cleanup = "ExecStartPre=/bin/rm -f %t/%n.ctr-id"
        run_index = next(i for i, line in enumerate(lines) if line.startswith("ExecStart="))

        self.assertIn(cleanup, lines)
        self.assertLess(lines.index(cleanup), run_index)

    def test_cidfile_has_exactly_one_owner(self):
        """`--rm` must not compete with ExecStopPost for the same cidfile.

        Observed on the production VM (2026-09-05): with both present, ten
        back-to-back restarts failed 2/10 with

            Error: remove /run/clairkeys-omr.service.ctr-id: no such file or directory
            clairkeys-omr.service: Main process exited, code=exited, status=125/n/a

        `--rm` makes podman's asynchronous container cleanup delete the cidfile,
        while ExecStopPost's `podman rm --cidfile` deletes it too. Two owners of
        one path race, and the late deletion removes the file the *next* start
        has already written. Removing `--rm` leaves ExecStopPost as the sole
        owner: 40 consecutive restarts then failed 0 times.

        `--replace` in ExecStart still covers a container that outlives its unit,
        so dropping `--rm` does not accumulate containers.
        """
        text = UNIT_PATH.read_text(encoding="utf-8")
        lines = text.splitlines()
        exec_start = _exec_start_block(lines)

        self.assertNotIn("--rm", exec_start)
        self.assertIn("--cidfile=%t/%n.ctr-id", exec_start)
        self.assertIn("--replace", exec_start)
        self.assertTrue(
            re.search(r"^ExecStopPost=/usr/bin/podman rm\b", text, re.MULTILINE),
            "ExecStopPost must remain the single owner that removes the cidfile",
        )
