# Repository governance

Mandatory flow for every code, configuration, workflow, infrastructure, or documentation change:

`feature branch -> real validation -> commit -> clean working tree -> push -> pull request -> independent CI validation -> merge -> post-merge verification -> auto-gate deploy -> deployed-SHA validation`

Direct commits or pushes to `main`/`master` are forbidden. Agents must not use `--no-verify` or any equivalent bypass. A failed validation blocks commit, push, PR merge, deploy, and task completion until fixed or explicitly proven to be an external blocker.

Before finishing any task, run `git status --porcelain=v1`; it must be empty for the task branch/worktree. Existing unrelated dirty worktrees must be preserved and must not be silently cleaned, reset, stashed, or overwritten.

No useful change may remain abandoned only in a local clone, worktree, stash, patch, runner directory, temporary directory, or unpushed commit. If the change belongs to the task, it must be validated, committed, pushed, reviewed, merged, and included in the deployed candidate when applicable.

A task is not complete while any applicable PR remains open, any related technical issue remains open, or any required Action/check for the candidate SHA is queued, in progress, failed, cancelled, or timed out. The agent must keep investigating and correcting failures until the canonical gates are green or an external blocker is demonstrated with evidence.

After merge, the exact resulting `main` SHA must be verified. The approved auto-gate must deploy exactly that SHA to the target environment. Any deployment failure must immediately return to diagnosis, correction, revalidation, merge, and redeploy; triggering a deploy is not evidence of successful deployment.

Post-deploy validation must cover the checks applicable to the change, including migrations, workers/queues, health/heartbeat, preflight, authenticated smoke, critical functional flows, backup/restore, and domain/DNS/TLS/Tunnel where relevant.

The mandatory completion policy is defined in `docs/operations/AUTOGATE_COMPLETION_POLICY.md` and is part of this governance contract.

Every clone/worktree must enable the versioned hooks once with:

`git config core.hooksPath .githooks`

The GitHub governance workflow repeats validation independently. Native branch protection/rulesets must additionally require pull requests and the governance status check wherever the GitHub plan supports those controls.
