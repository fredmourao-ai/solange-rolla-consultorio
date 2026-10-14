"""Auditoria V5: Quick Tunnel URL must belong to this running container and be live."""
from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/staging/reconcile-demo.sh"
OLD = "https://expired-audit-repro.trycloudflare.com"
NEW = "https://recovered-audit-repro.trycloudflare.com"
STARTED = "2026-10-14T02:56:43.61619367Z"


class StagingTunnelReconcilerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "bin").mkdir()
        source = SOURCE.read_text()
        self.assertEqual(source.count("\nwhile :; do\n"), 1)
        # Source functions only, never start the real service loop or touch staging.
        (self.root / "functions.sh").write_text(source.split("\nwhile :; do\n", 1)[0])
        docker = """#!/bin/sh
case "$1" in
inspect)
  [ -n "${MOCK_STARTED:-}" ] || exit 1
  printf '%s\\n' "$MOCK_STARTED"
  ;;
logs)
  printf '%s\\n' "$*" >> "$MOCK_DOCKER_CALLS"
  case " $* " in
    *"--since $MOCK_STARTED"* ) has_since=1 ;;
    *) has_since=0 ;;
  esac
  case " $* " in
    *"--tail "* ) has_tail=1 ;;
    *) has_tail=0 ;;
  esac
  if [ "$has_since" = 1 ] && [ "$has_tail" = 1 ]; then
    [ -z "${MOCK_RECENT_URL:-}" ] || printf '%s\\n' "2026-10-14T02:56:49Z $MOCK_RECENT_URL"
  else
    printf '%s\\n' "2026-10-01T09:00:00Z ${MOCK_OLD_URL}"
  fi
  ;;
restart)
  printf 'restart:%s\\n' "$*" >> "$MOCK_DOCKER_CALLS"
  ;;
*)
  exit 90
  ;;
esac
"""
        wget = """#!/bin/sh
printf '%s\\n' "$*" >> "$MOCK_WGET_CALLS"
[ "${MOCK_WGET_OK:-0}" = 1 ] || exit 1
"""
        for name, body in (("docker", docker), ("wget", wget)):
            f = self.root / "bin" / name
            f.write_text(body)
            f.chmod(0o755)
        self.marker = self.root / "current-url.txt"
        self.app = self.root / "app"
        self.app.mkdir()
        (self.app / "package.json").write_text("{}")
        (self.app / ".env.production.local").write_text(f"APP_URL={OLD}\n")
        self.marker.write_text(OLD + "\n")
        self.docker_calls = self.root / "docker-calls.txt"
        self.wget_calls = self.root / "wget-calls.txt"

    def run_shell(self, body: str, **overrides: str):
        env = dict(os.environ,
            PATH=str(self.root / "bin") + os.pathsep + os.environ["PATH"],
            MOCK_STARTED=STARTED,
            MOCK_OLD_URL=OLD,
            MOCK_RECENT_URL=NEW,
            MOCK_DOCKER_CALLS=str(self.docker_calls),
            MOCK_WGET_CALLS=str(self.wget_calls),
            MOCK_WGET_OK="0",
            TEST_APP_DIR=str(self.app),
            TEST_MARKER=str(self.marker),
            TEST_FUNCTIONS=str(self.root / "functions.sh"),
        )
        env.update(overrides)
        result = subprocess.run(["sh", "-c", '. "$TEST_FUNCTIONS"\n' + body],
                                env=env, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def test_current_url_uses_running_tunnel_lifetime_and_bounded_history(self):
        result = self.run_shell("current_tunnel_url")
        self.assertEqual(result, NEW)
        calls = self.docker_calls.read_text()
        self.assertIn(f"--since {STARTED}", calls)
        self.assertIn("--tail ", calls)

    def test_missing_current_tunnel_identity_never_falls_back_to_old_hostname(self):
        self.assertEqual(self.run_shell("current_tunnel_url", MOCK_STARTED=""), "")

    def test_no_quick_tunnel_url_yet_never_falls_back_to_previous_instance(self):
        self.assertEqual(self.run_shell("current_tunnel_url", MOCK_RECENT_URL=""), "")

    def test_unreachable_public_url_does_not_update_marker_or_app_env(self):
        body = """
APP="$TEST_APP_DIR"
URL_FILE="$TEST_MARKER"
app_valid() { return 0; }
current_tunnel_url() { printf '%s\\n' "$MOCK_RECENT_URL"; }
reconcile_url
"""
        self.run_shell(body, MOCK_WGET_OK="0")
        self.assertEqual(self.marker.read_text().strip(), OLD)
        self.assertEqual((self.app / ".env.production.local").read_text().strip(), "APP_URL=" + OLD)
        self.assertFalse(self.docker_calls.exists(), "web must not restart for an unhealthy URL")

    def test_reachable_public_url_updates_marker_and_app_env(self):
        body = """
APP="$TEST_APP_DIR"
URL_FILE="$TEST_MARKER"
app_valid() { return 0; }
current_tunnel_url() { printf '%s\\n' "$MOCK_RECENT_URL"; }
reconcile_url
"""
        self.run_shell(body, MOCK_WGET_OK="1")
        self.assertEqual(self.marker.read_text().strip(), NEW)
        self.assertEqual((self.app / ".env.production.local").read_text().strip(), "APP_URL=" + NEW)
        self.assertIn("restart:restart solange-client-demo-web", self.docker_calls.read_text())
        self.assertIn(NEW + "/api/health", self.wget_calls.read_text())


if __name__ == "__main__":
    unittest.main()
