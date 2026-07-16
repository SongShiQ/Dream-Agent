# Unit Judge Docker Image

Build locally on the Linux judge host:

```bash
docker build -t opencamp/unit-judge-rust:2026-summer docker/unit-judge
```

Production smoke on the Linux judge host:

```bash
npm run judge:docker-smoke
```

This command builds the image, creates a temporary student, runs all five unit gates through the Docker executor, verifies AC-only gate progress, verifies `lab1-batch` unlock, and deletes the temporary student. Running it on Docker Desktop with `--allow-non-linux` is useful for local contract debugging, but does not count as production M5 validation.

Runtime contract:

```bash
unit-judge --gate <gateId> --submission /workspace/submission.rs --spec /workspace/judge-spec.json
```

The web worker passes Docker resource/isolation flags from `lib/judge/sandbox.ts`.
The container first checks public JSON rules, then runs the optional Rust single-file harness via `cargo test --quiet --offline`.
