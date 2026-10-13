import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))

function makeExecutable(file: string) {
  chmodSync(file, 0o755)
}

describe('backup restore drill readiness', () => {
  it('avoids ephemeral Alpine ownership containers and retains the PostgreSQL backup client image', () => {
    const source = readFileSync(path.join(projectRoot, 'scripts/backup-homologation.sh'), 'utf8')
    const installerFile = path.join(projectRoot, 'ops/backup/run-demo-scheduler.sh')
    const installer = readFileSync(installerFile, 'utf8')
    expect(source).toContain('chown 1001:1001 "$FULLTMP" "$APPTMP"')
    expect(source).toContain('chmod 0600 "$FULL.sha256" "$APP.sha256" "$DEST/LAST_SUCCESS"')
    expect(source).not.toContain('alpine sh -lc')
    expect(installer).toContain('CLIENT_IMAGE=postgres:15-alpine')
    expect(installer).toContain('CLIENT_ANCHOR=solange-backup-pg15-client-image-anchor')
    expect(installer).toContain('docker create --name "$CLIENT_ANCHOR" --network none --read-only --restart no')
    expect(installer).toContain('docker container inspect "$CLIENT_ANCHOR"')
    expect(spawnSync('sh', ['-n', path.join(projectRoot, 'scripts/backup-homologation.sh')]).status).toBe(0)
    expect(spawnSync('bash', ['-n', installerFile]).status).toBe(0)
  })

  it('uses the database network namespace without exposing long-lived database credentials', () => {
    const source = path.join(projectRoot, 'scripts/backup-homologation.sh')
    const body = readFileSync(source, 'utf8')
    expect(body).not.toContain('Config.Env')
    expect(body).not.toContain('POSTGRES_PASSWORD')
    expect(body).not.toContain('PGPASSWORD')
    expect(body.match(/--network "container:\$SOURCE_CONTAINER"/g)).toHaveLength(2)
    expect(body.match(/--entrypoint pg_dump postgres:15-alpine -h 127\.0\.0\.1/g)).toHaveLength(2)
    expect(body).toContain("backup_failed: db_not_running")
    expect(body).toContain('sha256sum "$FULL"')
    expect(body).toContain('sha256sum "$APP"')
    expect(spawnSync('sh', ['-n', source], { encoding: 'utf8' }).status).toBe(0)
  })

  it('waits for final startup and restores into a clean Supabase-compatible database', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'restore-readiness-'))
    const bin = path.join(root, 'bin')
    const state = path.join(root, 'state')
    const backup = path.join(root, 'backup.dump')
    mkdirSync(bin)
    mkdirSync(state)
    writeFileSync(backup, 'fixture')

    const docker = path.join(bin, 'docker')
    writeFileSync(docker, `#!/bin/sh
set -eu
state=\${FAKE_DOCKER_STATE:?}
cmd=\$1
shift
printf '%s %s\\n' "\$cmd" "\$*" >> "\$state/invocations"
case "\$cmd" in
  run) exit 0 ;;
  logs)
    n=0
    [ -f "\$state/logs" ] && n=\$(cat "\$state/logs")
    n=\$((n + 1))
    printf '%s' "\$n" > "\$state/logs"
    if [ "\$n" -ge 2 ]; then
      echo 'PostgreSQL init process complete; ready for start up.'
      : > "\$state/final-ready"
    fi
    exit 0
    ;;
  exec)
    while [ "\${1:-}" = '-e' ]; do shift 2; done
    name=\$1
    shift
    sub=\$1
    shift
    case "\$sub" in
      pg_isready) exit 0 ;;
      createdb) exit 0 ;;
      psql)
        if [ ! -f "\$state/final-ready" ]; then
          echo 'simulated socket disappeared during init restart' >&2
          exit 2
        fi
        case " \$* " in
          *' -Atc '*) echo 't|t|t|t' ;;
        esac
        exit 0
        ;;
      pg_restore) exit 0 ;;
    esac
    ;;
  rm) exit 0 ;;
esac
echo "unexpected docker invocation: \$cmd \$*" >&2
exit 99
`)
    makeExecutable(docker)

    try {
      const result = spawnSync('sh', [path.join(projectRoot, 'scripts/verify-backup-restore-docker.sh')], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH ?? ''}`,
          FAKE_DOCKER_STATE: state,
          BACKUP_FILE: backup,
        },
      })

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
      expect(result.stdout).toContain('restore_success')

      const invocations = readFileSync(path.join(state, 'invocations'), 'utf8')
      expect(invocations).toContain('public.ecr.aws/supabase/postgres:15.8.1.085')
      expect(invocations).toMatch(/exec -e PGPASSWORD=restore-only .* createdb -U supabase_admin -T template0 solange_restore/)
      expect(invocations).toMatch(/exec -e PGPASSWORD=restore-only .* pg_restore -U supabase_admin -d solange_restore --no-owner --no-privileges --exit-on-error/)
      expect(invocations).toMatch(/exec -e PGPASSWORD=restore-only .* psql -U supabase_admin -d solange_restore .*drop schema public/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
