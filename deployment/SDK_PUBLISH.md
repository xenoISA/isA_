# Publishing @isa SDK Packages

The isA_ app depends on three SDK packages from `isA_App_SDK`:

| Package | Scope | Source |
|---------|-------|--------|
| `@isa/core` | `@xenoisa` | `isA_App_SDK/packages/core` |
| `@isa/transport` | `@xenoisa` | `isA_App_SDK/packages/transport` |
| `@isa/ui-web` | `@xenoisa` | `isA_App_SDK/packages/ui-web` |

These are published to **GitHub Packages** under the `@xenoisa` npm scope.

## How Publishing Works

A GitHub Actions workflow (`.github/workflows/publish-sdk.yml`) handles publishing:

- **Manual trigger**: Go to Actions > "Publish SDK Packages" > Run workflow. Optionally specify a version.
- **Automated trigger**: Send a `repository_dispatch` event of type `sdk-release` from the isA_App_SDK repo.

The workflow builds and publishes all three packages in parallel using `GITHUB_TOKEN` for authentication.

## Consuming Packages

The `.npmrc` at the project root configures the `@xenoisa` scope to pull from GitHub Packages:

```
@xenoisa:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Set `NPM_TOKEN` to a GitHub personal access token (classic) with `read:packages` scope, or use `GITHUB_TOKEN` in CI.

## Docker Builds

Pass the token as a build argument:

```bash
docker build --build-arg NPM_TOKEN=$NPM_TOKEN -t isa-app .
```

The `.npmrc` is copied into the deps stage for `npm ci` and then removed so the token does not leak into the final image.

## Local Development Without Registry

For local development against unpublished SDK changes, use npm overrides in `package.json`:

```json
{
  "overrides": {
    "@isa/core": "file:../isA_App_SDK/packages/core",
    "@isa/transport": "file:../isA_App_SDK/packages/transport",
    "@isa/ui-web": "file:../isA_App_SDK/packages/ui-web"
  }
}
```

Or use `npm link` from each SDK package directory:

```bash
cd ../isA_App_SDK/packages/core && npm link
cd ../isA_App_SDK/packages/transport && npm link
cd ../isA_App_SDK/packages/ui-web && npm link
cd ../isA_ && npm link @isa/core @isa/transport @isa/ui-web
```
