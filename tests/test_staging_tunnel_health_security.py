import os
import pathlib
import subprocess
import tempfile
import unittest

RECONCILER = (pathlib.Path(__file__).with_name('reconcile-demo.sh') if pathlib.Path(__file__).with_name('reconcile-demo.sh').exists() else pathlib.Path(__file__).resolve().parents[1] / 'ops/staging/reconcile-demo.sh')
EXPECTED = 'a'*40
WRONG = 'b'*40
OLD = 'https://old-invalid.trycloudflare.com'
NEW = 'https://new-current.trycloudflare.com'
START = '2026-10-15T22:00:35.776091088Z'
SHELL_FAKES = r'''
APP="$TEST_APP"
URL_FILE="$TEST_URL_FILE"
RELEASE_SHA_FILE="$TEST_RELEASE_SHA_FILE"
log() { :; }
app_valid() { return 0; }
docker() {
  case "$1" in
    inspect)
      case "$*" in
        *State.Running*) printf "true\n" ;;
        *State.StartedAt*) printf "2026-10-15T22:00:35.776091088Z\n" ;;
        *) return 1 ;;
      esac ;;
    logs) printf "2026-10-15T22:00:36.000000000Z tunnel https://new-current.trycloudflare.com\n" ;;
    restart)
      printf "RESTART\n" >> "$TEST_RESTART_LOG"
      [ "$TEST_RESTART_FAIL" = no ] ;;
    *) return 1 ;;
  esac
}
getent() { return 0; }
wget() {
  if [ "$TEST_REDIRECT" = yes ]; then
    printf '  HTTP/1.1 302 Found\n  Location: https://untrusted.example/api/health\n' >&2
  fi
  printf '  HTTP/1.1 200 OK\n' >&2
  printf '%s' "$TEST_HEALTH_BODY"
}
reconcile_url
'''

def run_case(health, *, redirect=False, restart_fail=False, env_url=OLD):
    raw = RECONCILER.read_text().split('\nwhile :; do\n')[0]
    with tempfile.TemporaryDirectory(prefix='solange-ci-security-') as d:
        root=pathlib.Path(d)
        app=root/'app'; app.mkdir()
        app.joinpath('package.json').write_text('{}')
        app.joinpath('.env.production.local').write_text('APP_URL='+env_url+'\n')
        state=root/'state'; state.mkdir()
        state.joinpath('deployed-sha.txt').write_text(EXPECTED+'\n')
        url=state/'current-url.txt';url.write_text(OLD+'\n')
        restart=root/'restarts.txt'; restart.write_text('')
        env=os.environ.copy()
        env.update(TEST_APP=str(app),TEST_URL_FILE=str(url),TEST_RELEASE_SHA_FILE=str(state/'deployed-sha.txt'),TEST_RESTART_LOG=str(restart),TEST_RESTART_FAIL='yes' if restart_fail else 'no',TEST_REDIRECT='yes' if redirect else 'no',TEST_HEALTH_BODY=health)
        out=subprocess.run(['sh','-c',raw+'\n'+SHELL_FAKES],capture_output=True,text=True,env=env,timeout=9)
        return out.returncode, url.read_text(), app.joinpath('.env.production.local').read_text(),restart.read_text(),out.stderr

HEALTH='{"status":"ok","buildSha":"'+EXPECTED+'"}'
class TestReconcilerSecurity(unittest.TestCase):
    def check_fails_closed(self,body,**kw):
        rc,url,env,restart,stderr=run_case(body,**kw)
        self.assertEqual(url,OLD+'\n',f'url leaked status={rc} stderr={stderr[:120]}')
        self.assertEqual(env,'APP_URL='+OLD+'\n')
        self.assertEqual(restart,'')

    def test_positive_new_url(self):
        rc,url,env,restart,err=run_case(HEALTH)
        self.assertEqual(rc,0,err)
        self.assertEqual(url,NEW+'\n')
        self.assertEqual(env,'APP_URL='+NEW+'\n')
        self.assertEqual(restart,'RESTART\n')

    def test_redirect_followed_to_forged_200_refused(self):
        self.check_fails_closed(HEALTH,redirect=True)

    def test_duplicate_status_keys_refused(self):
        self.check_fails_closed('{"status":"fail","status":"ok","buildSha":"'+EXPECTED+'"}')

    def test_duplicate_build_sha_keys_refused(self):
        self.check_fails_closed('{"status":"ok","buildSha":"'+WRONG+'","buildSha":"'+EXPECTED+'"}')

    def test_escaped_shadow_status_key_refused(self):
        self.check_fails_closed('{"status":"ok","buildSha":"'+EXPECTED+'","sta\\u0074us":"fail"}')

    def test_nested_keys_do_not_count(self):
        self.check_fails_closed('{"health":{"status":"ok","buildSha":"'+EXPECTED+'"}}')

    def test_restart_failure_keeps_previous_marker_and_env(self):
        rc,url,env,restart,err=run_case(HEALTH,restart_fail=True)
        self.assertEqual(url,OLD+'\n')
        self.assertEqual(env,'APP_URL='+OLD+'\n')
        self.assertEqual(restart,'RESTART\nRESTART\n')

    def test_already_current_updates_marker_without_restart(self):
        rc,url,env,restart,err=run_case(HEALTH,env_url=NEW)
        self.assertEqual(rc,0,err)
        self.assertEqual(url,NEW+'\n')
        self.assertEqual(restart,'')

if __name__=='__main__': unittest.main()
