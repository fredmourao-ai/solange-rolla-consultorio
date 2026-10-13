"""RED/GREEN: prove backup metadata belongs to the actual hosted staging project."""
from __future__ import annotations
import datetime as dt
import importlib.util
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import patch

SCRIPT=Path(__file__).resolve().parents[1]/"scripts"/"verify-managed-backup-evidence.py"
spec=importlib.util.spec_from_file_location("managed_backup",SCRIPT)
checker=importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(checker)

NOW=dt.datetime(2026,10,13,12,0,tzinfo=dt.timezone.utc)
REF="abcdefghijklmnopqrst"
PROD="zyxwvutsrqponmlkjihg"
URL=f"https://{REF}.supabase.co"
TOKEN="synthetic_DO_NOT_LOG_management_token"
def backup(age=3600,status="COMPLETED"):
    stamp=(NOW-dt.timedelta(seconds=age)).isoformat().replace("+00:00","Z")
    return {"id":42,"is_physical_backup":True,"status":status,"inserted_at":stamp}
def document(backups=None, pitr=False):
    return {"region":"sa-east-1","walg_enabled":pitr,"pitr_enabled":pitr,
            "backups":list(backups if backups is not None else [backup()])}

class ManagedEvidenceTests(unittest.TestCase):
    def test_verifies_correct_staging_environment(self):
        self.assertEqual(checker.validate_environment(REF,PROD,URL),REF)
    def test_rejects_cross_project_environment(self):
        with self.assertRaises(checker.AuditFailure):
            checker.validate_environment(REF,PROD,f"https://{PROD}.supabase.co")
    def test_rejects_production_project_as_staging(self):
        with self.assertRaises(checker.AuditFailure):
            checker.validate_environment(PROD,PROD,f"https://{PROD}.supabase.co")
    def test_rejects_fake_ref(self):
        with self.assertRaises(checker.AuditFailure):
            checker.validate_environment("../admin",PROD,URL)
    def test_rejects_url_with_credentials(self):
        with self.assertRaises(checker.AuditFailure):
            checker.validate_environment(REF,PROD,f"https://token@{REF}.supabase.co")
    def test_rejects_url_with_external_domain_or_port(self):
        for url in ("http://"+REF+".supabase.co","https://evil.example",
                    f"https://{REF}.supabase.co.evil.example",
                    f"https://{REF}.supabase.co:444"):
            with self.subTest(url=url), self.assertRaises(checker.AuditFailure):
                checker.validate_environment(REF,PROD,url)
    def test_recent_completed_physical_backup_passes(self):
        summary=checker.verify_backups(document(),NOW,max_age_seconds=90000)
        self.assertTrue(summary["ok"])
        self.assertEqual(summary["completed_count"],1)
        self.assertEqual(summary["age_seconds"],3600)
    def test_stale_completed_backup_rejected(self):
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(document([backup(age=172800)]),NOW)
    def test_empty_backups_rejected(self):
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(document([]),NOW)
    def test_noncompleted_backup_rejected(self):
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(document([backup(status="IN_PROGRESS")]),NOW)
    def test_future_backup_time_rejected(self):
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(document([backup(age=-7200)]),NOW)
    def test_invalid_timestamp_rejected(self):
        p=document();p["backups"][0]["inserted_at"]="invalid"
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(p,NOW)
    def test_bad_api_payload_rejected(self):
        for payload in ({}, [], {"backups":"fake"}, {"backups":[{}]}, "ok"):
            with self.subTest(payload=payload), self.assertRaises(checker.AuditFailure):
                checker.verify_backups(payload,NOW)
    def test_recent_pitr_metadata_passes_when_no_snapshot_list(self):
        p=document([],pitr=True)
        p["physical_backup_data"]={"latest_physical_backup_date_unix":int((NOW-dt.timedelta(hours=2)).timestamp())}
        result=checker.verify_backups(p,NOW)
        self.assertEqual(result["source"],"pitr")
    def test_recent_pitr_is_authoritative_when_snapshot_is_stale(self):
        # PITR replaces daily backups; an old daily snapshot is not the latest source.
        p=document([backup(age=172800)],pitr=True)
        p["physical_backup_data"]={"latest_physical_backup_date_unix":int((NOW-dt.timedelta(hours=2)).timestamp())}
        result=checker.verify_backups(p,NOW)
        self.assertEqual(result["source"],"pitr")
        self.assertEqual(result["age_seconds"],7200)
    def test_stale_pitr_rejected_even_when_snapshot_is_recent(self):
        p=document([backup(age=3600)],pitr=True)
        p["physical_backup_data"]={"latest_physical_backup_date_unix":int((NOW-dt.timedelta(days=2)).timestamp())}
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(p,NOW)
    def test_missing_pitr_metadata_rejected_even_when_snapshot_is_recent(self):
        p=document([backup(age=3600)],pitr=True)
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(p,NOW)
    def test_invalid_pitr_metadata_rejected_even_when_snapshot_is_recent(self):
        p=document([backup(age=3600)],pitr=True)
        p["physical_backup_data"]={"latest_physical_backup_date_unix":"invalid"}
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(p,NOW)
    def test_pitr_without_valid_latest_time_rejected(self):
        p=document([],pitr=True)
        p["physical_backup_data"]={"latest_physical_backup_date_unix":"not-a-number"}
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(p,NOW)
    def test_api_errors_are_sanitized(self):
        class Rejected:
            def __call__(self,request,timeout=0):
                raise RuntimeError("leaked "+TOKEN+" from fake provider")
        with self.assertRaises(checker.AuditFailure) as err:
            checker.fetch_backups(REF,TOKEN,opener=Rejected())
        self.assertNotIn(TOKEN,str(err.exception))
    def test_api_missing_auth_fails_closed(self):
        with self.assertRaises(checker.AuditFailure):
            checker.fetch_backups(REF,"")
    def test_api_reply_excessively_large_rejected(self):
        class Fake:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,size=-1):return b"x"*262145
        with self.assertRaises(checker.AuditFailure):
            checker.fetch_backups(REF,TOKEN,opener=lambda req,timeout=0:Fake())
    def test_status_messages_never_print_secret_or_project_refs(self):
        out=io.StringIO();err=io.StringIO()
        with patch.dict("os.environ",{"SUPABASE_STAGING_PROJECT_REF":REF,
                                     "SUPABASE_PRODUCTION_PROJECT_REF":PROD,
                                     "NEXT_PUBLIC_SUPABASE_URL":URL,
                                     "SUPABASE_ACCESS_TOKEN":TOKEN}), \
             patch.object(checker,"fetch_backups",return_value=document([])), \
             redirect_stdout(out),redirect_stderr(err):
            code=checker.main([])
        self.assertNotEqual(code,0)
        self.assertNotIn(TOKEN,out.getvalue()+err.getvalue())
        self.assertNotIn(REF,out.getvalue()+err.getvalue())
        self.assertIn("MANAGED_STAGING_BACKUP=FAIL",out.getvalue()+err.getvalue())

    def test_missing_pitr_state_fails_closed_with_recent_snapshot(self):
        p=document()
        p.pop("pitr_enabled")
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(p,NOW)

    def test_pitr_state_must_be_boolean_even_with_recent_snapshot(self):
        for state in (None, "false", "true", 0, 1, [], {}):
            with self.subTest(state=repr(state)), self.assertRaises(checker.AuditFailure):
                checker.verify_backups({**document(), "pitr_enabled":state},NOW)

    def test_nonfinite_pitr_timestamps_rejected_without_uncaught_errors(self):
        for latest in (float("nan"),float("inf"),float("-inf")):
            p=document([],pitr=True)
            p["physical_backup_data"]={"latest_physical_backup_date_unix":latest}
            with self.subTest(latest=str(latest)), self.assertRaises(checker.AuditFailure):
                checker.verify_backups(p,NOW)

    def test_out_of_range_pitr_timestamp_rejected_without_crash(self):
        p=document([],pitr=True)
        p["physical_backup_data"]={"latest_physical_backup_date_unix":9.99e11}
        with self.assertRaises(checker.AuditFailure):
            checker.verify_backups(p,NOW)

    def test_valid_pitr_not_blocked_by_unrelated_old_snapshot_timestamp(self):
        p=document([backup()],pitr=True)
        p["backups"][0]["inserted_at"]="not-a-valid-timestamp"
        p["physical_backup_data"]={"latest_physical_backup_date_unix":int((NOW-dt.timedelta(hours=2)).timestamp())}
        result=checker.verify_backups(p,NOW)
        self.assertEqual(result["source"],"pitr")

if __name__=="__main__": unittest.main()
