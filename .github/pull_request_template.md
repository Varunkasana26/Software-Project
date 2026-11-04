## What changed

<!-- One or two sentences. Branch name should be feature/<name>-<topic>. Commit messages use "<lane>: <what changed>". -->

## Lane touched

<!-- Tick the lane you edited. Edit only your own folder (see OWNERS.md). -->

- [ ] core
- [ ] backend
- [ ] frontend
- [ ] docs
- [ ] tests
- [ ] shared/contracts
- [ ] root files (README, scripts, .github)

## Tests run

<!-- Paste the real result, not what you expect. Write "not run" if you did not run it. -->

- [ ] `python -m pytest core/tests`
- [ ] `cd backend/api && npm test`
- [ ] `cd frontend && npm run build`
- [ ] `python scripts/smoke-test.py` (needs the stack running)

Result:

## Contract changes (shared/contracts)

- [ ] No
- [ ] Yes. These go through Varun only. Describe the change and which lanes it affects:

## Checklist

- [ ] No secrets, `.env` files or real passwords are in this change
- [ ] I did not change `core/rules/rules.json` (rules are frozen until the real-contract evaluation), or I explained why above
- [ ] Docs are updated if behaviour changed
