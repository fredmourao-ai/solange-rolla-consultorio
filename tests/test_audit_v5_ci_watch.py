import importlib.util
import pathlib
import unittest
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'audit_v5_ci_watch.py'
spec = importlib.util.spec_from_file_location('v5_ci_watch', SCRIPT)
watch = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = watch
spec.loader.exec_module(watch)

SHA = 'a' * 40


def row(name, status='completed', conclusion='success', job_id=12):
    return {'name': name, 'status': status, 'conclusion': conclusion,
            'details_url': f'https://github.com/{watch.REPOSITORY}/actions/runs/23/job/{job_id}',
            'started_at': '2026-10-13T23:20:00Z'}


class FakeApi:
    def __init__(self, cancelled=False):
        self.posts = []
        self.patches = []
        self.cancelled = cancelled
        self.comments = []

    def get(self, path):
        if '/pulls/' in path:
            return {'head': {'sha': SHA, 'repo': {'full_name': watch.REPOSITORY}}, 'state': 'open'}
        if '/check-runs?' in path:
            values = [row(n, job_id=i+20) for i, n in enumerate(watch.REQUIRED)]
            if self.cancelled:
                values[0]['conclusion'] = 'cancelled'
            return {'check_runs': values}
        if '/comments?' in path:
            return self.comments
        raise AssertionError(path)

    def post(self, path, body):
        self.posts.append((path, body))
        return {'id': 123}

    def patch(self, path, body):
        self.patches.append((path, body))
        return {'id': 123}


class WatchTests(unittest.TestCase):
    def test_all_green_still_requires_review_and_runtime(self):
        checks = watch.current_checks([row(n) for n in watch.REQUIRED])
        self.assertEqual(watch.classify(checks), 'CHECKS_GREEN_REVIEW_REQUIRED')
        self.assertIn('AUDIT_VERDICT=NAO_APTO', watch.render_status([(296,SHA,'8/8','CHECKS_GREEN_REVIEW_REQUIRED')], 'nenhuma'))

    def test_cancelled_check_not_a_green_result(self):
        checks = watch.current_checks([row('e2e', conclusion='cancelled')])
        self.assertEqual(watch.classify(checks), 'CHECKS_CANCELLED_RETRY_ELIGIBLE')

    def test_newer_queued_attempt_hides_cancelled_prior_attempt(self):
        old = row('e2e', conclusion='cancelled', job_id=3)
        new = row('e2e', status='queued', conclusion=None, job_id=4)
        new['started_at'] = '2026-10-13T23:21:00Z'
        self.assertEqual(watch.classify(watch.current_checks([old,new])), 'CHECKS_INCOMPLETE')

    def test_one_rerun_reservation_before_external_action(self):
        api = FakeApi(cancelled=True)
        watch.run(api)
        actions = [i for i,x in enumerate(api.posts) if '/actions/jobs/' in x[0]]
        reservations = [i for i,x in enumerate(api.posts) if '/issues/149/comments' in x[0]]
        self.assertEqual(len(actions), 1)
        self.assertTrue(reservations and reservations[0] < actions[0])
        self.assertEqual(api.posts[actions[0]][0], f'/repos/{watch.REPOSITORY}/actions/jobs/20/rerun')

    def test_old_reservation_prevents_retry_loop(self):
        api = FakeApi(cancelled=True)
        api.comments = [{'id':2, 'user':{'login':'github-actions[bot]'},
                         'body':watch.retry_marker(296,SHA,'architecture')}]
        watch.run(api)
        self.assertFalse(any('/actions/jobs/' in path for path,_ in api.posts))

    def test_no_retry_on_failed_but_not_cancelled(self):
        self.assertEqual(watch.classify(watch.current_checks([row('e2e', conclusion='failure')])),
                         'CHECKS_FAILED_REMEDIATION_REQUIRED')
        api = FakeApi()
        watch.run(api)
        self.assertFalse(any('/actions/jobs/' in path for path,_ in api.posts))

    def test_untrusted_comment_cannot_reserve_bot_retry(self):
        api = FakeApi(cancelled=True)
        api.comments = [{'id':2, 'user':{'login':'random-outsider'},
                         'body':watch.retry_marker(296,SHA,'architecture')}]
        watch.run(api)
        self.assertEqual(len([1 for path,_ in api.posts if '/actions/jobs/' in path]),1)

    def test_no_foreign_or_malformed_retry(self):
        with self.assertRaises(ValueError):
            watch.retry_marker(296, 'bad', 'db')
        with self.assertRaises(ValueError):
            watch.retry_marker(999, SHA, 'db')

    def test_fails_closed_if_wrong_repository_or_ref(self):
        with patch.dict('os.environ', {'GITHUB_REPOSITORY':'other/other','GITHUB_REF':'refs/heads/main'}):
            self.assertEqual(watch.main(), 2)

    def test_status_comment_changed_only_when_needed(self):
        api=FakeApi()
        first=watch.run(api)
        self.assertEqual(first['status'],'updated')
        body=next(body['body'] for path,body in api.posts if '/issues/149/comments' in path)
        api.comments=[{'id':123, 'user':{'login':'github-actions[bot]'},'body':body}]
        n=len(api.posts)
        self.assertEqual(watch.run(api)['status'],'unchanged')
        self.assertEqual(len(api.posts),n)


if __name__ == '__main__':
    unittest.main()
