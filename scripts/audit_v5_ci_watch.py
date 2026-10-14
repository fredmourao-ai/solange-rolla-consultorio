#!/usr/bin/env python3
"""Deterministic, bounded V5 CI repair and issue checkpoint; no model or deploy.

This monitor never merges, changes protected refs, runs browser flows, or claims APTO.
A scheduled run may retry at most one canceled required CI job, once per
PR head SHA and check name. It persists the reservation in issue #149 before
attempting the retry, to avoid infinite retries across scheduled runs.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPOSITORY = "fredmourao-ai/solange-rolla-consultorio"
ISSUE = 149
PRS = (296, 292, 295, 283, 286)
REQUIRED = ("architecture", "lint", "build", "typecheck", "unit", "e2e", "db", "governance-gate")
STATUS_MARKER = "<!-- SOLANGE_V5_CI_WATCH_V1 -->"
RETRY_MARKER_PREFIX = "<!-- SOLANGE_V5_CI_RETRY_V1"
API = "https://api.github.com"


class ApiError(RuntimeError):
    pass


class GitHub:
    def __init__(self, token: str):
        if not token:
            raise ApiError("missing_ephemeral_github_token")
        self.token = token

    def request(self, method: str, path: str, *, body: dict | None = None):
        if not path.startswith("/repos/" + REPOSITORY + "/"):
            raise ApiError("repository_scope_violation")
        if method not in {"GET", "POST", "PATCH"}:
            raise ApiError("method_not_allowed")
        payload = json.dumps(body).encode() if body is not None else None
        req = Request(API + path, data=payload, method=method, headers={
            "Authorization": "Bearer " + self.token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "SolangeAuditV5CIWatch/1",
            **({"Content-Type": "application/json"} if payload is not None else {}),
        })
        try:
            with urlopen(req, timeout=15) as resp:
                content = resp.read(1_000_001)
                if len(content) > 1_000_000:
                    raise ApiError("provider_response_too_large")
                return json.loads(content) if content else {}
        except (HTTPError, URLError, ValueError, TimeoutError) as exc:
            # Never expose raw response bodies or authorization headers.
            code = getattr(exc, "code", "transport")
            raise ApiError("github_api_failed_" + str(code)) from None

    def get(self, path):
        return self.request("GET", path)

    def post(self, path, body):
        return self.request("POST", path, body=body)

    def patch(self, path, body):
        return self.request("PATCH", path, body=body)


@dataclass(frozen=True)
class Check:
    name: str
    status: str
    conclusion: str
    job_id: int
    check_run_id: int


def current_checks(raw: list[dict]) -> dict[str, Check]:
    latest: dict[str, Check] = {}
    for row in raw:
        name = str(row.get("name", ""))
        if name not in REQUIRED:
            continue
        details_url = str(row.get("details_url", ""))
        match = re.fullmatch(
            r"https://github\.com/fredmourao-ai/solange-rolla-consultorio/actions/runs/[0-9]+/job/([0-9]+)",
            details_url,
        )
        job_id = int(match.group(1)) if match else 0
        candidate = Check(name, str(row.get("status") or ""),
                          str(row.get("conclusion") or ""), job_id,
                          int(row.get("id") or 0))
        previous = latest.get(name)
        # Use GitHub's monotonic check-run ID (or job ID in legacy fixtures)
        # instead of started_at: queued retries may have null timestamps.
        if previous is None or (candidate.check_run_id or candidate.job_id) > (previous.check_run_id or previous.job_id):
            latest[name] = candidate
    return latest


def classify(checks: dict[str, Check]) -> str:
    if set(REQUIRED).issubset(checks) and all(
        checks[name].status == "completed" and checks[name].conclusion == "success"
        for name in REQUIRED
    ):
        return "CHECKS_GREEN_REVIEW_REQUIRED"
    if any(checks.get(name) and checks[name].status == "completed"
           and checks[name].conclusion in {"failure", "timed_out", "action_required"}
           for name in REQUIRED):
        return "CHECKS_FAILED_REMEDIATION_REQUIRED"
    if any(checks.get(name) and checks[name].status == "completed"
           and checks[name].conclusion == "cancelled" for name in REQUIRED):
        return "CHECKS_CANCELLED_RETRY_ELIGIBLE"
    return "CHECKS_INCOMPLETE"


def retry_marker(pr: int, sha: str, check_name: str) -> str:
    if not re.fullmatch(r"[a-f0-9]{40}", sha) or check_name not in REQUIRED or pr not in PRS:
        raise ValueError("invalid_retry_identity")
    return f"{RETRY_MARKER_PREFIX} pr={pr} sha={sha} check={check_name} -->"


def issue_comments(api: GitHub) -> list[dict]:
    comments = []
    for page in range(1, 6):
        batch = api.get(f"/repos/{REPOSITORY}/issues/{ISSUE}/comments?per_page=100&page={page}")
        if not isinstance(batch, list):
            raise ApiError("issue_comments_invalid")
        comments.extend(batch)
        if len(batch) < 100:
            break
    if len(comments) >= 500:
        # Prevent an unseen old reservation from causing a duplicate rerun.
        raise ApiError("issue_comment_history_incomplete")
    return comments


def github_bot_comment(row: dict) -> bool:
    return str((row.get("user") or {}).get("login", "")) == "github-actions[bot]"


def render_status(records: list[tuple[int, str, str, str]], retry_note: str) -> str:
    parts = [STATUS_MARKER, "### Auditoria Extrema V5 — acompanhamento determinístico de CI",
             "Monitoramento de PRs, não certificação de aplicação ou de ambiente.",
             "| PR | Head | Checks obrigatórios | Situação |", "|---|---|---|---|"]
    for pr, sha, complete, status in records:
        parts.append(f"| #{pr} | `{sha[:12]}` | {complete} | `{status}` |")
    parts.extend([
        "", "**AUDIT_VERDICT=NAO_APTO.** Checks verdes não dispensam revisão independente, merge protegido, ",
        "staging no SHA/release correto, backup/restore Supabase gerenciado, Storage, Auth/AAL2, UI real e certificador V5.",
        "", f"Reexecução segura neste ciclo: {retry_note}.",
    ])
    return "\n".join(parts)


def run(api: GitHub) -> dict:
    records: list[tuple[int, str, str, str]] = []
    retry_candidates: list[tuple[int, str, Check]] = []
    for pr in PRS:
        payload = api.get(f"/repos/{REPOSITORY}/pulls/{pr}")
        if (payload.get("head") or {}).get("repo", {}).get("full_name") != REPOSITORY:
            raise ApiError("foreign_pull_request_head")
        sha = str((payload.get("head") or {}).get("sha") or "")
        if not re.fullmatch(r"[a-f0-9]{40}", sha):
            raise ApiError("invalid_pull_request_head")
        if payload.get("state") != "open":
            records.append((pr, sha, "n/a", "CLOSED_NOT_CERTIFIED"))
            continue
        response = api.get(f"/repos/{REPOSITORY}/commits/{sha}/check-runs?per_page=100")
        checks = current_checks(response.get("check_runs", []))
        status = classify(checks)
        complete = f"{sum(checks.get(n) is not None and checks[n].conclusion == 'success' for n in REQUIRED)}/{len(REQUIRED)}"
        records.append((pr, sha, complete, status))
        if status == "CHECKS_CANCELLED_RETRY_ELIGIBLE":
            for n in REQUIRED:
                c = checks.get(n)
                if c and c.conclusion == "cancelled" and c.status == "completed" and c.job_id:
                    retry_candidates.append((pr, sha, c))

    comments = issue_comments(api)
    # A previously reserved cancellation must not starve other cancelled
    # required jobs. Scan in deterministic PR/check order, choose one *new*
    # reservation per cycle, and never repeat an already reserved attempt.
    retry_target = next((
        candidate for candidate in retry_candidates
        if not any(
            github_bot_comment(comment) and
            retry_marker(candidate[0], candidate[1], candidate[2].name) in str(comment.get("body") or "")
            for comment in comments
        )
    ), None)
    retry_note = "nenhuma"
    if retry_target:
        pr, sha, check = retry_target
        marker = retry_marker(pr, sha, check.name)
        # Reservation precedes the external write for at-most-one retry per
        # SHA/check across scheduled runs, including partial failures.
        reservation = api.post(f"/repos/{REPOSITORY}/issues/{ISSUE}/comments", {
            "body": marker + "\nReexecução de check cancelado reservada. "
            "Uma tentativa somente; nenhum merge, deploy ou mudança de produção."
        })
        comment_id = reservation.get("id")
        if not isinstance(comment_id, int):
            raise ApiError("retry_reservation_not_persisted")
        try:
            api.post(f"/repos/{REPOSITORY}/actions/jobs/{check.job_id}/rerun", {})
        except ApiError:
            retry_note = f"#{pr}/{check.name}: rerun recusado (revisão manual)"
        else:
            retry_note = f"#{pr}/{check.name}: rerun solicitado uma vez"
        api.patch(f"/repos/{REPOSITORY}/issues/comments/{comment_id}", {
            "body": marker + "\n" + retry_note + ". Sem merge/deploy ou certificação V5."
        })
    elif retry_candidates:
        retry_note = "todos os jobs cancelados deste escopo já possuem reserva; não repetir"

    body = render_status(records, retry_note)
    digest = hashlib.sha256(body.encode()).hexdigest()
    old = next((c for c in comments if github_bot_comment(c) and STATUS_MARKER in str(c.get("body") or "")), None)
    if old and str(old.get("body") or "") == body:
        return {"status": "unchanged", "digest": digest, "retry": retry_note}
    if old:
        api.patch(f"/repos/{REPOSITORY}/issues/comments/{old['id']}", {"body": body})
    else:
        api.post(f"/repos/{REPOSITORY}/issues/{ISSUE}/comments", {"body": body})
    return {"status": "updated", "digest": digest, "retry": retry_note}


def main() -> int:
    if os.environ.get("GITHUB_REPOSITORY") != REPOSITORY or os.environ.get("GITHUB_REF") != "refs/heads/main":
        print("V5_CI_WATCH=DENIED repository_or_ref_mismatch", file=sys.stderr)
        return 2
    try:
        result = run(GitHub(os.environ.get("GITHUB_TOKEN", "")))
    except (ApiError, KeyError, TypeError) as exc:
        print("V5_CI_WATCH=FAIL " + str(exc), file=sys.stderr)
        return 1
    print("V5_CI_WATCH=" + result["status"].upper() + " status_sha256=" + result["digest"][:12])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
