from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/ci.yml"
EXPORT_SCRIPT = ROOT / "scripts/export-local-e2e-env.sh"
SECRET_ENV_KEYS = (
    "DB_URL",
    "PUBLISHABLE_KEY",
    "SECRET_KEY",
    "CLINICAL_ENCRYPTION_KEY_V1",
    "RATE_LIMIT_HMAC_KEY",
    "PUBLIC_ACTION_HMAC_KEY",
    "DEMO_LOCAL_PASSWORD",
)


class LocalE2EEnvironmentMaskingTests(unittest.TestCase):
    def test_synthetic_values_are_masked_before_export_and_absent_from_visible_logs(self) -> None:
        self.assertTrue(EXPORT_SCRIPT.is_file(), "local E2E env exporter is missing")
        sentinels = {
            key: f"SENTINEL_{key}_b87f3a6c"
            for key in SECRET_ENV_KEYS
        }
        sentinels["DB_URL"] = (
            "postgresql://local:SENTINEL_DB_URL_b87f3a6c=part%25value@"
            "127.0.0.1:54322/postgres"
        )
        status_output = "\n".join((
            'API_URL="http://127.0.0.1:54321"',
            f'DB_URL="{sentinels["DB_URL"]}"',
            f'PUBLISHABLE_KEY="{sentinels["PUBLISHABLE_KEY"]}"',
            f'SECRET_KEY="{sentinels["SECRET_KEY"]}"',
        )) + "\n"
        with tempfile.TemporaryDirectory(prefix="ci-env-mask-") as temp:
            env_file = Path(temp) / "github-env"
            env = os.environ.copy()
            env.update(sentinels)
            env.update({
                "GITHUB_ENV": str(env_file),
                "GITHUB_WORKSPACE": str(ROOT),
            })
            result = subprocess.run(
                ["bash", str(EXPORT_SCRIPT)],
                cwd=ROOT,
                env=env,
                input=status_output,
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, "local env export failed")
            self.assertTrue(result.stderr == "", "local env exporter wrote to stderr")
            output_lines = [line for line in result.stdout.splitlines() if line]
            self.assertEqual(len(output_lines), len(sentinels))
            self.assertTrue(all(line.startswith("::add-mask::") for line in output_lines))
            def decode_command_data(value: str) -> str:
                return value.replace("%0D", "\r").replace("%0A", "\n").replace("%25", "%")

            registered_masks = {
                decode_command_data(line.removeprefix("::add-mask::"))
                for line in output_lines
            }
            self.assertEqual(registered_masks, set(sentinels.values()))

            # GitHub consumes these workflow commands and redacts their values in stored logs.
            visible_log = "\n".join("##[add-mask]***" for _ in output_lines)
            for sentinel in sentinels.values():
                self.assertNotIn(sentinel, visible_log)

            exported = dict(
                line.split("=", 1)
                for line in env_file.read_text(encoding="utf-8").splitlines()
            )
            for key, sentinel in sentinels.items():
                target = {
                    "PUBLISHABLE_KEY": "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
                    "SECRET_KEY": "SUPABASE_SECRET_KEY",
                }.get(key, key)
                self.assertEqual(exported[target], sentinel)

    def test_env_file_cannot_be_written_inside_workspace_or_artifact_paths(self) -> None:
        env_file = ROOT / ".ci-env-sentinel-test"
        env = os.environ.copy()
        env.update({
            "API_URL": "http://127.0.0.1:54321",
            "DB_URL": "SENTINEL_DB_URL_b87f3a6c",
            "PUBLISHABLE_KEY": "SENTINEL_PUBLISHABLE_b87f3a6c",
            "SECRET_KEY": "SENTINEL_SECRET_b87f3a6c",
            "GITHUB_ENV": str(env_file),
            "GITHUB_WORKSPACE": str(ROOT),
        })
        try:
            result = subprocess.run(
                ["bash", str(EXPORT_SCRIPT)],
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0, "workspace env-file path must fail closed")
            self.assertTrue(result.stderr.strip() == "local_e2e_env_file_in_workspace", "only a generic path error may be logged")
            self.assertFalse(env_file.exists(), "sensitive values must not be written into the workspace")
        finally:
            env_file.unlink(missing_ok=True)

    def test_ci_has_read_only_permissions_and_does_not_publish_artifacts_or_use_remote_secrets(self) -> None:
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertTrue("permissions:\n  contents: read" in workflow, "CI permission scope must stay read-only")
        self.assertTrue("secrets." not in workflow, "CI must not consume managed secrets")
        self.assertTrue("actions/upload-artifact" not in workflow, "CI must not publish artifacts")
        self.assertTrue("actions/download-artifact" not in workflow, "CI must not import artifacts")
        self.assertTrue("npx supabase@2.118.0 status -o env" in workflow, "E2E must use local Supabase")
        self.assertTrue("scripts/export-local-e2e-env.sh" in workflow, "E2E env must use the mask helper")
        self.assertTrue('echo "SUPABASE_SECRET_KEY=' not in workflow, "secret values must not appear in workflow text")
        self.assertTrue('echo "DEMO_LOCAL_PASSWORD=' not in workflow, "password values must not appear in workflow text")


if __name__ == "__main__":
    unittest.main()
