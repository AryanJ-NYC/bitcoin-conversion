# Publishing

This project is published to npm as `bitcoin-conversion`.

## Prerequisites
- npm account with publish access to `bitcoin-conversion`
- npm auth configured locally (`npm whoami` should succeed)
- Node >= 18
- Dependencies installed (`yarn install`)

## Release Checklist
1. Ensure branch contains the intended release changes.
2. Run verification:
   ```bash
   yarn test --watchAll=false
   yarn build
   ```
3. Bump version (SemVer):
   ```bash
   npm version patch --no-git-tag-version
   # or: npm version minor --no-git-tag-version
   # or: npm version major --no-git-tag-version
   ```
4. Publish package:
   ```bash
   npm publish
   ```
5. Verify published version:
   ```bash
   npm view bitcoin-conversion version
   ```

## Recommended Git Steps
After a successful publish, commit and tag the release:
```bash
git add -A
git commit -m "release: v<version>"
git tag v<version>
git push origin <branch> --tags
```

## Common Issues
- `E401` / `E403`: run `npm login` and confirm package permissions.
- `You cannot publish over the previously published versions`: bump version and retry.
- 2FA required: run publish and enter OTP when prompted.
