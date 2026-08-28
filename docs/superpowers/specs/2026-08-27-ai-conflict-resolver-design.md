# AI Conflict Resolver — Design

Date: 2026-08-27
Status: proposed
Repository: fredmourao-ai/solange-rolla-consultorio

## Goal

Add a conservative AI-assisted merge-conflict resolver with no per-token API cost and without bypassing repository safety, CI, privacy, or deployment controls.

## Current constraint

GitHub Models was retired on 2026-07-30. The implementation therefore must not depend on GitHub Models. AI inference will run locally on a self-hosted runner using Ollama or llama.cpp.

## Architecture

1. GitHub Actions detects conflicted pull requests and also supports manual execution.
2. A disposable workspace attempts to merge the PR head with its target branch without committing.
3. Only conflicted files and bounded source context are processed by a local model on the trusted self-hosted runner.
4. Deterministic guards validate the generated resolution before repository tests run.
5. If all checks succeed, a normal commit may be pushed to an eligible same-repository PR branch; the resolver never merges the PR itself.
6. Ambiguous or protected conflicts stop for human review.

## Security and privacy boundaries

- Least-privilege GITHUB_TOKEN permissions.
- Never expose secrets, .env files, credentials, certificates, production databases, patient records, consultation data, payment data, medical information, or personally identifiable information to the model.
- No automatic resolution for authentication/authorization, billing/payment, destructive migrations, production deployment controls, workflow permission changes, legal/consent text, clinical/business rules involving patient records, or mass deletion.
- No force-push and no privileged writes to fork PRs.
- Never resolve a whole file by blindly choosing ours/theirs.

## Repository-specific protection

For solange-rolla-consultorio, conflicts involving patient data models, appointment cancellation/charging policy, consent/legal text, authentication, database migrations, production environment gates, payments, messaging/confirmation logic, or sensitive health-related flows are high-risk and must fail closed unless the resolution is deterministic and fully covered by existing tests.

## Proposed files

- `.github/workflows/ai-conflict-resolver.yml`
- `.github/scripts/ai_conflict_resolver.py`
- `.github/scripts/validate_conflict_resolution.sh`
- `AI_CONFLICT_RULES.md`
- automated tests for parser, path protection, marker detection, and unsafe-output rejection

## Model runtime

Use Ollama on a trusted self-hosted Linux runner over localhost/private networking. The model name is configurable and should default to a code-capable local model suitable for the available hardware. The workflow fails closed when inference is unavailable.

## Resolution protocol

Each conflict is represented as BASE/OURS/THEIRS plus repository rules. The model returns only the proposed complete content for the current file inside a machine-validated envelope. Output is rejected if it contains conflict markers, changes an unexpected path, deletes substantial behavior without deterministic justification, or attempts to alter protected files.

## Validation

Before write-back:

1. no conflict markers remain;
2. only permitted files changed;
3. protected paths/rules are honored;
4. CI, database safety checks, lint, type checks and tests run where available;
5. no secrets or sensitive data are introduced;
6. conservative diff/deletion thresholds are respected.

## Commit and PR behavior

A successful resolution creates a normal commit on an eligible same-repository PR branch. It does not merge the PR, weaken branch protection, or skip required checks. Existing auto-merge may operate only after normal repository checks succeed.

## Failure behavior

Fork PRs, protected-path conflicts, unavailable model, ambiguous output, failed tests, or unsafe diffs leave the branch untouched and report the reason.

## Cost model

No paid AI API is required. A self-hosted runner avoids GitHub-hosted Actions minute consumption; compute uses project-controlled infrastructure.

## Rollout

Enable report-only/dry-run first. After validating real conflicted PRs, enable guarded write-back for low-risk files only. Sensitive patient, legal, payment, deployment, and migration areas remain human-reviewed.
