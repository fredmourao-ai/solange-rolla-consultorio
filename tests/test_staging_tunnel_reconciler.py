"""Adversarial Quick Tunnel recovery tests, using isolated synthetic files."""
from __future__ import annotations

import os
import pathlib
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "ops/staging/reconcile-demo.sh"
OLD = "https://obsolete-public.trycloudflare.com"
NEW = "https://valid-new.trycloudflare.com"


class TunnelReconcilerTests(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory(prefix="solange-quick-tunnel-v5-")
        self.addCleanup(t.cleanup)
        self.base = pathlib.Path(t.name)
        self.app = self.base / "app"
        self.state = self.base / "state"
        self.bin = self.base / "bin"
        for path in (self.app, self.state, self.bin):
            path.mkdir(parents=True, exist_ok=True)
        (self.app / "package.json").write_text('{"name":"synthetic"}')
        (self.app / "node_modules" / ".bin").mkdir(parents=True)
        executable = self.app / "node_modules" / ".bin" / "next"
        executable.write_text("#!/bin/sh\nexit 0\n")
        executable.chmod(0o700)
        (self.app / ".next").mkdir()
        (self.app / ".next" / "BUILD_ID").write_text("synthetic-build-id\n")
        (self.app / ".env.production.local").write_text("SYNTHETIC_CONFIG=present\nAPP_URL=" + OLD + "\n")
        (self.state / "current-url.txt").write_text(OLD + "\n")
        self.calls = self.base / "docker-calls"
        self.all_logs = self.base / "all.log"
        self.fresh_logs = self.base / "fresh.log"
        self.all_logs.write_text("2026-10-01T00:00:00Z INF |  " + OLD + " |\n")
        self.fresh_logs.write_text("2026-10-14T05:40:00Z INF | " + NEW + " |\n")
        docker = self.bin / "docker"
        docker.write_text(r'''#!/usr/bin/env python3
import os, sys, pathlib
args = sys.argv[1:]
kind = args[0]
base = pathlib.Path(os.environ["FAKE_BASE"])
if kind == "inspect":
    print("2026-10-14T05:39:54Z" if ".State.StartedAt" in " ".join(args) else "running")
elif kind == "logs":
    fresh = "--since" in args and "--tail" in args
    log = base / ("fresh.log" if fresh else "all.log")
    sys.stderr.write(log.read_text())
elif kind == "restart":
    with (base / "docker-calls").open("a") as f: f.write("restart " + args[-1] + "\n")
    if args[-1] == "solange-client-demo-web" and os.environ.get("FAKE_FAIL_WEB") == "1":
        sys.exit(3)
elif kind == "start":
    with (base / "docker-calls").open("a") as f: f.write("start " + args[-1] + "\n")
else:
    sys.exit(6)
''')
        docker.chmod(0o700)
        wget = self.bin / "wget"
        wget.write_text(r'''#!/usr/bin/env python3
import os,sys
mode=os.environ.get("FAKE_WGET","200")
if mode=="200": sys.stderr.write("  HTTP/1.1 200 OK\n")
elif mode=="redirect": sys.stderr.write("  HTTP/1.1 302 Found\n  HTTP/1.1 200 OK\n")
elif mode=="error": sys.stderr.write("  HTTP/1.1 503 Service Unavailable\n")
else: sys.exit(4)
sys.exit(0)
''')
        wget.chmod(0o700)
        self.env = {
            **os.environ,
            "PATH": str(self.bin) + os.pathsep + os.environ["PATH"],
            "FAKE_BASE": str(self.base),
            "SOLANGE_RECONCILE_APP": str(self.app),
            "SOLANGE_RECONCILE_STATE_DIR": str(self.state),
            "SOLANGE_RECONCILE_ONCE": "1",
            "FAKE_WGET": "200",
            "SOLANGE_TUNNEL_RESTART_COOLDOWN_SECONDS": "900",
        }

    def execute(self):
        return subprocess.run(
            ["sh", str(SCRIPT), "--once"], env=self.env, capture_output=True,
            text=True, timeout=4, check=False,
        )

    def config(self):
        return (self.app / ".env.production.local").read_text()

    def marker(self):
        return (self.state / "current-url.txt").read_text().strip()

    def calls_text(self):
        return self.calls.read_text() if self.calls.exists() else ""

    def test_healthy_new_tunnel_atomically_updates_config_and_marker(self):
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertIn("APP_URL=" + NEW, self.config())
        self.assertEqual(NEW, self.marker())
        self.assertEqual("restart solange-client-demo-web\n", self.calls_text())
        self.assertNotIn("SYNTHETIC_CONFIG", result.stdout + result.stderr)

    def test_ignores_obsolete_hostname_from_previous_docker_log_session(self):
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(NEW, self.marker())
        self.assertIn("APP_URL=" + NEW, self.config())

    def test_unhealthy_public_url_is_never_written(self):
        self.env["FAKE_WGET"] = "error"
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(OLD, self.marker())
        self.assertEqual("APP_URL=" + OLD, self.config().splitlines()[-1])
        self.assertNotIn("restart solange-client-demo-web", self.calls_text())

    def test_http_redirect_cannot_be_accepted_as_health(self):
        self.env["FAKE_WGET"] = "redirect"
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(OLD, self.marker())
        self.assertNotIn("restart solange-client-demo-web", self.calls_text())

    def test_tls_or_dns_failure_keeps_state_unchanged(self):
        self.env["FAKE_WGET"] = "dns"
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(OLD, self.marker())
        self.assertEqual("APP_URL=" + OLD, self.config().splitlines()[-1])

    def test_expired_tunnel_is_renewed_once_without_touching_web(self):
        self.fresh_logs.write_text(
            "2026-10-14T05:42:00Z ERR Unauthorized: Tunnel not found\n"
        )
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(OLD, self.marker())
        self.assertEqual("restart solange-demo-tunnel\n", self.calls_text())
        self.assertTrue((self.state / ".tunnel-renewed-at").exists())

    def test_tunnel_restart_respects_cooldown(self):
        self.fresh_logs.write_text(
            "2026-10-14T05:42:00Z ERR Unauthorized: Tunnel not found\n"
        )
        (self.state / ".tunnel-renewed-at").write_text("9999999999\n")
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual("", self.calls_text())

    def test_corrupted_cooldown_file_fails_closed(self):
        self.fresh_logs.write_text(
            "2026-10-14T05:42:00Z ERR Unauthorized: Tunnel not found\n"
        )
        (self.state / ".tunnel-renewed-at").write_text("not-a-timestamp\n")
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual("", self.calls_text())

    def test_web_restart_error_rolls_back_config_and_marker(self):
        self.env["FAKE_FAIL_WEB"] = "1"
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(OLD, self.marker())
        self.assertEqual("APP_URL=" + OLD, self.config().splitlines()[-1])
        self.assertIn("restart solange-client-demo-web", self.calls_text())

    def test_already_current_does_not_restart_web(self):
        (self.app / ".env.production.local").write_text(
            "SYNTHETIC_CONFIG=present\nAPP_URL=" + NEW + "\n"
        )
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual("", self.calls_text())
        self.assertEqual(NEW, self.marker())

    def test_unknown_or_invalid_url_is_not_reconciled(self):
        self.fresh_logs.write_text(
            "2026-10-14T05:40:00Z INF |  https://fake.trycloudflare.com.evil.invalid |\n"
        )
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(OLD, self.marker())
        self.assertEqual("", self.calls_text())

    def test_missing_app_does_not_touch_runtime_files(self):
        (self.app / ".env.production.local").unlink()
        result = self.execute()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(OLD, self.marker())
        self.assertEqual("", self.calls_text())


if __name__ == "__main__":
    unittest.main()
