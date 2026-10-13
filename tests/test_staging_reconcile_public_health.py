"""Adversarial tests for the published quick-tunnel reconciler.

All Docker, DNS and HTTPS effects run through disposable command stubs.
"""
from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "ops/staging/reconcile-demo.sh"
SHA = "a" * 40
OLD_SHA = "b" * 40
URL = "https://synthetic-268.trycloudflare.com"
OLD_URL = "https://obsolete-268.trycloudflare.com"


class PublicReconcilerTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix="solange-268-tunnel-")
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.bins = self.root / "bin"
        self.bins.mkdir()
        self.app = self.root / "app"
        self.app.mkdir()
        self.state = self.root / "state"
        self.state.mkdir()
        (self.app / "package.json").write_text('{"name":"test"}', encoding="utf-8")
        (self.app / ".env.production.local").write_text(
            "APP_URL=" + OLD_URL + "\nNEXT_PUBLIC_SUPABASE_URL=https://synthetic.supabase.co\n",
            encoding="utf-8",
        )
        (self.state / "deployed-sha.txt").write_text(SHA + "\n")
        (self.state / "current-url.txt").write_text(OLD_URL + "\n")
        self.status = self.state / "public-health-status.txt"
        self.docker_calls = self.root / "docker-calls.txt"
        self.executable("getent", "#!/bin/sh\nif [ \"$FAKE_DNS_DOWN\" = 1 ]; then exit 2; fi\nprintf '192.0.2.1\\n'\n")
        self.executable("wget", "#!/bin/sh\nif [ \"$FAKE_PUBLIC_DOWN\" = 1 ]; then exit 4; fi\nprintf '%s' \"$FAKE_HEALTH_BODY\"\n")
        self.executable(
            "docker",
            "#!/bin/sh\n"
            "printf '%s\\n' \"$1\" >> \"$FAKE_DOCKER_CALLS\"\n"
            "case \"$1\" in\n"
            "  inspect) printf 'running\\n' ;;\n"
            "  logs) printf 'routing %s\\n' \"$FAKE_TUNNEL_URL\" ;;\n"
            "  exec) python3 -c 'import sys,json; d=json.load(sys.stdin); assert isinstance(d,dict) and d.get(\"status\")==\"ok\" and d.get(\"environment\")==\"staging\"; print(d.get(\"buildSha\",\"\"))' ;;\n"
            "  start|restart) exit 0 ;;\n"
            "  *) exit 88 ;;\n"
            "esac\n",
        )
        self.environment = {
            **os.environ,
            "PATH": str(self.bins) + os.pathsep + os.environ["PATH"],
            "SOLANGE_APP_DIR": str(self.app),
            "SOLANGE_PUBLIC_URL_FILE": str(self.state / "current-url.txt"),
            "SOLANGE_DEPLOYED_SHA_FILE": str(self.state / "deployed-sha.txt"),
            "SOLANGE_PUBLIC_STATUS_FILE": str(self.status),
            "FAKE_DOCKER_CALLS": str(self.docker_calls),
            "FAKE_TUNNEL_URL": URL,
            "FAKE_HEALTH_BODY": self.body(SHA),
        }

    def executable(self, name, content):
        f = self.bins / name
        f.write_text(content, encoding="utf-8")
        f.chmod(0o755)

    def body(self, sha=SHA, status="ok", environment="staging"):
        return ('{"status":"' + status + '","environment":"' + environment
                + '","buildSha":"' + sha + '"}')

    def execute(self, *args, env=None):
        return subprocess.run(
            ["sh", str(SCRIPT), *args],
            capture_output=True, text=True, timeout=15,
            env=self.environment if env is None else {**self.environment, **env},
        )

    def test_probe_accepts_public_tls_health_exact_sha(self):
        p = self.execute("--probe-public", URL, SHA)
        self.assertEqual(0, p.returncode, p.stderr)

    def test_probe_rejects_wrong_sha_despite_http_200(self):
        p = self.execute("--probe-public", URL, SHA, env={"FAKE_HEALTH_BODY": self.body(OLD_SHA)})
        self.assertNotEqual(0, p.returncode)

    def test_probe_rejects_non_staging_health(self):
        for status, environment in (("failed", "staging"), ("ok", "production")):
            with self.subTest(status=status, environment=environment):
                p = self.execute(
                    "--probe-public", URL, SHA,
                    env={"FAKE_HEALTH_BODY": self.body(status=status, environment=environment)},
                )
                self.assertNotEqual(0, p.returncode)

    def test_probe_rejects_network_failure(self):
        p = self.execute("--probe-public", URL, SHA, env={"FAKE_PUBLIC_DOWN": "1"})
        self.assertNotEqual(0, p.returncode)

    def test_probe_rejects_dns_unavailable(self):
        p = self.execute("--probe-public", URL, SHA, env={"FAKE_DNS_DOWN": "1"})
        self.assertNotEqual(0, p.returncode)

    def test_probe_rejects_unsafe_urls(self):
        for url in (
            "http://synthetic-268.trycloudflare.com",
            "https://user:pass@synthetic-268.trycloudflare.com",
            "https://synthetic-268.trycloudflare.com.evil.invalid",
            "https://synthetic-268.trycloudflare.com/path",
            "https://synthetic-268.trycloudflare.com?key=SECRET",
            "https://127.0.0.1",
        ):
            with self.subTest(url=url):
                self.assertNotEqual(0, self.execute("--probe-public", url, SHA).returncode)

    def test_probe_rejects_invalid_sha_and_non_json(self):
        self.assertNotEqual(0, self.execute("--probe-public", URL, "main").returncode)
        p = self.execute("--probe-public", URL, SHA, env={"FAKE_HEALTH_BODY": "successful"})
        self.assertNotEqual(0, p.returncode)

    def test_probe_rejects_malformed_http_200_with_success_tokens(self):
        malformed = (
            '{"status":"ok","environment":"staging","buildSha":"' + SHA + '",}',
            '<html>"status":"ok","environment":"staging","buildSha":"' + SHA + '"</html>',
        )
        for body in malformed:
            with self.subTest(body_kind=body[:8]):
                p = self.execute("--probe-public", URL, SHA, env={"FAKE_HEALTH_BODY": body})
                self.assertNotEqual(0, p.returncode)

    def test_once_post_restart_external_failure_restores_previous_app_url(self):
        self.executable(
            "wget",
            "#!/bin/sh\n"
            "if [ -f \"$FAKE_WGET_CALLED\" ]; then exit 4; fi\n"
            "touch \"$FAKE_WGET_CALLED\"\n"
            "printf '%s' \"$FAKE_HEALTH_BODY\"\n",
        )
        p = self.execute("--once", env={"FAKE_WGET_CALLED": str(self.root / "wget-called")})
        self.assertNotEqual(0, p.returncode)
        self.assertIn("restart", self.docker_calls.read_text())
        env = (self.app / ".env.production.local").read_text()
        self.assertIn("APP_URL=" + OLD_URL, env)
        self.assertFalse((self.state / "current-url.txt").exists())
        self.assertEqual("UNHEALTHY\n", self.status.read_text())

    def test_once_web_restart_error_restores_previous_app_url(self):
        self.executable(
            "docker",
            "#!/bin/sh\n"
            "printf '%s\\n' \"$1\" >> \"$FAKE_DOCKER_CALLS\"\n"
            "case \"$1\" in\n"
            "  inspect) echo running ;;\n"
            "  logs) printf 'routing %s\\n' \"$FAKE_TUNNEL_URL\" ;;\n"
            "  exec) python3 -c 'import sys,json; d=json.load(sys.stdin); assert isinstance(d,dict) and d.get(\"status\")==\"ok\" and d.get(\"environment\")==\"staging\"; print(d.get(\"buildSha\",\"\"))' ;;\n"
            "  restart) exit 5 ;;\n"
            "  *) exit 0 ;;\n"
            "esac\n",
        )
        p = self.execute("--once")
        self.assertNotEqual(0, p.returncode)
        self.assertIn("restart", self.docker_calls.read_text())
        env = (self.app / ".env.production.local").read_text()
        self.assertIn("APP_URL=" + OLD_URL, env)
        self.assertEqual("UNHEALTHY\n", self.status.read_text())

    def test_once_public_healthy_updates_marker_and_app_url(self):
        p = self.execute("--once")
        self.assertEqual(0, p.returncode, p.stderr)
        self.assertEqual(URL, (self.state / "current-url.txt").read_text().strip())
        self.assertEqual("HEALTHY\n", self.status.read_text())
        env = (self.app / ".env.production.local").read_text()
        self.assertIn("APP_URL=" + URL, env)
        self.assertIn("NEXT_PUBLIC_SUPABASE_URL=https://synthetic.supabase.co", env)
        self.assertIn("restart", self.docker_calls.read_text())

    def test_once_unhealthy_tunnel_blocks_url_publication_without_restart(self):
        p = self.execute("--once", env={"FAKE_PUBLIC_DOWN": "1"})
        self.assertNotEqual(0, p.returncode)
        self.assertFalse((self.state / "current-url.txt").exists())
        self.assertEqual("UNHEALTHY\n", self.status.read_text())
        env = (self.app / ".env.production.local").read_text()
        self.assertIn("APP_URL=" + OLD_URL, env)
        self.assertNotIn("restart", self.docker_calls.read_text())

    def test_once_mismatched_release_blocks_even_when_tunnel_running(self):
        p = self.execute("--once", env={"FAKE_HEALTH_BODY": self.body(OLD_SHA)})
        self.assertNotEqual(0, p.returncode)
        self.assertFalse((self.state / "current-url.txt").exists())
        self.assertEqual("UNHEALTHY\n", self.status.read_text())

    def test_once_missing_release_id_fails_closed(self):
        (self.state / "deployed-sha.txt").unlink()
        p = self.execute("--once")
        self.assertNotEqual(0, p.returncode)
        self.assertFalse((self.state / "current-url.txt").exists())

    def test_once_missing_tunnel_url_fails_closed(self):
        p = self.execute("--once", env={"FAKE_TUNNEL_URL": "no public tunnel"})
        self.assertNotEqual(0, p.returncode)
        self.assertFalse((self.state / "current-url.txt").exists())


if __name__ == "__main__":
    unittest.main()
