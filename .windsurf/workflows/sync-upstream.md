---
description: Safely sync our fork with the upstream OpenWhispr repository
---

# Sync Upstream OpenWhispr

This workflow safely merges upstream changes into our fork while preserving fork-specific customizations.

## Pre-flight Checks

1. Ensure working tree is clean:
// turbo
```bash
git status
```

2. Fetch latest upstream:
```bash
git fetch upstream
```

3. Check how many commits behind we are:
// turbo
```bash
git log --oneline HEAD..upstream/main
```

If 0 commits behind, stop here — already up to date.

## Review Upstream Changes

4. Review the upstream diff to identify conflict-prone files:
// turbo
```bash
git diff --stat HEAD...upstream/main
```

5. Check if any of our **high-risk fork files** are modified upstream:
// turbo
```bash
git diff --name-only HEAD...upstream/main | grep -E "(audioManager|ipcHandlers|useSettings|SettingsPage|environment|preload|electron\.ts|main\.jsx)"
```

If any of those files are modified upstream, proceed with extra caution in step 7.

## Merge

6. Create a backup branch before merging:
```bash
git branch pre-upstream-sync-$(date +%Y%m%d)
```

7. Merge upstream/main into our branch:
```bash
git merge upstream/main --no-edit
```

If conflicts occur:
- Open each conflicted file and resolve carefully
- **Always preserve our fork-specific changes** (see `.windsurf/rules/openwhispr.md` section "Fork-Specific Customizations")
- Pay special attention to `audioManager.js` (streaming chunk combining, MIN_CHUNK_SIZE, agentName scoping)
- Pay special attention to `ipcHandlers.js` (get-reasoning-config, REASONING_PROVIDER clearing logic)
- Pay special attention to `useSettings.ts` (normalizeCustomDictionary, areDictionariesEqual, assemblyAiStreaming)

## Post-Merge Verification

8. Run TypeScript check:
```bash
cd src && npx tsc --noEmit && cd ..
```

9. Start dev server and verify core features:
```bash
npm run dev
```

10. Test checklist (manual):
- [ ] Dictation works (press hotkey, speak, verify paste)
- [ ] Agent trigger works ("Hey [AgentName], ...")
- [ ] Dictionary shows individual terms (not blobs)
- [ ] Streaming partial transcripts appear during recording
- [ ] Settings page loads without errors

11. If all tests pass, push:
```bash
git push origin main
```

## Rollback

If something is broken after merge:
```bash
git reset --hard pre-upstream-sync-$(date +%Y%m%d)
git push --force-with-lease origin main
```

## Upstream Branches to Watch

Check these branches for upcoming changes that may affect our fork:
- `upstream/correction-monitoring` — may touch audioManager reasoning flow
- `upstream/gpu-detection` — may affect whisper/parakeet processing
- `upstream/streaming-text` — likely touches streaming pipeline (high conflict risk)
- `upstream/neon-auth-refactor` — auth changes, lower conflict risk
- `upstream/windows-fast-paste` — clipboard changes, moderate risk
- `upstream/feature/fix-ai-prompt-test` — may touch prompt/reasoning system
