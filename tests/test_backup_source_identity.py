from __future__ import annotations

import json
import os
import pathlib
import subprocess
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "backup-homologation.sh"
STAGING_REF = "stagingprojectref123456789"
PRODUCTION_REF = "productionprojectref987654321"


class BackupSourceIdentityTests(unittest.TestCase):
    def run_backup(self, runtime_url: str):
        temp = tempfile.TemporaryDirectory(prefix="solange-backup-identity-")
        self.addCleanup(temp.cleanup)
        root = pathlib.Path(temp.name)
        bin_dir = root / "bin"
        dest = root / "backups"
        bin_dir.mkdir()
        dest.mkdir()
        calls = root / "docker-calls.jsonl"
        docker = bin_dir / "docker"
        docker.write_text("""#!/usr/bin/env python3
import json, os, pathlib, sys
args = sys.argv[1:]
with open(os.environ["FAKE_DOCKER_CALLS"], "a", encoding="utf-8") as handle:
    handle.write(json.dumps(args) + "\\n")
if args[0] == "exec":
    name = args[-1]
    values = {
        "SUPABASE_STAGING_PROJECT_REF": os.environ["FAKE_STAGING_REF"],
        "SUPABASE_PRODUCTION_PROJECT_REF": os.environ["FAKE_PRODUCTION_REF"],
        "NEXT_PUBLIC_SUPABASE_URL": os.environ["FAKE_RUNTIME_URL"],
    }
    if name in values:
        print(values[name])
    sys.exit(0)
if args[0] == "inspect":
    print("true")
    sys.exit(0)
if args[0] == "run":
    if "-f" in args:
        dump = pathlib.Path(os.environ["SOLANGE_BACKUP_DEST"]) / pathlib.Path(args[args.index("-f") + 1]).name
        dump.write_text("synthetic dump bytes", encoding="utf-8")
    sys.exit(0)
sys.exit(97)
""", encoding="utf-8")
        docker.chmod(0o755)
        chown = bin_dir / "chown"
        chown.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        chown.chmod(0o755)
        env = {
            **os.environ,
            "PATH": str(bin_dir) + os.pathsep + os.environ.get("PATH", ""),
            "SOLANGE_BACKUP_DEST": str(dest),
            "SOLANGE_DB_CONTAINER": "synthetic-db",
            "SOLANGE_DB_NETWORK": "synthetic-network",
            "SOLANGE_WEB_CONTAINER": "synthetic-web",
            "FAKE_DOCKER_CALLS": str(calls),
            "FAKE_STAGING_REF": STAGING_REF,
            "FAKE_PRODUCTION_REF": PRODUCTION_REF,
            "FAKE_RUNTIME_URL": runtime_url,
        }
        result = subprocess.run(["sh", str(SCRIPT)], text=True, capture_output=True, env=env, timeout=10)
        rows = [json.loads(line) for line in calls.read_text().splitlines()] if calls.exists() else []
        return result, dest, rows

    def test_managed_supabase_runtime_refuses_unrelated_local_dump(self):
        result, dest, calls = self.run_backup("https://" + STAGING_REF + ".supabase.co")
        self.assertNotEqual(0, result.returncode, result.stdout)
        self.assertIn("source_identity_mismatch", result.stderr)
        self.assertFalse(any(row[0] == "run" for row in calls))
        self.assertEqual([], list(dest.iterdir()))

    def test_local_runtime_writes_two_checked_dumps_without_password_transport(self):
        result, dest, calls = self.run_backup("http://127.0.0.1:54321")
        self.assertEqual(0, result.returncode, result.stderr)
        dumps = list(dest.glob("*.dump"))
        self.assertEqual(2, len(dumps))
        self.assertTrue((dest / "LAST_SUCCESS").is_file())
        self.assertEqual(2, sum(row[0] == "run" for row in calls))
        self.assertFalse(any("PGPASSWORD" in arg or "POSTGRES_PASSWORD" in arg for row in calls for arg in row))
        source = SCRIPT.read_text(encoding="utf-8")
        self.assertNotIn("POSTGRES_PASSWORD", source)
        self.assertNotIn("PGPASSWORD", source)


if __name__ == "__main__":
    unittest.main()
