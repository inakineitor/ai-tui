# ai-tui

A design system monorepo with automated publishing via Changesets.

## What's inside?

This Turborepo includes the following:

### Apps and Packages

- `@ai-tui/docs`: Documentation site powered by [Next.js](https://nextjs.org/) (deployed to Vercel)
- `@ai-tui/core`: Core React components (published to npm)
- `@ai-tui/components`: Shared React utilities (published to npm)
- `@ai-tui/tsconfig`: Shared `tsconfig.json`s used throughout the monorepo (private)

Each package and app is 100% [TypeScript](https://www.typescriptlang.org/).

### Directory Structure

```
ai-tui/
├── apps/
│   └── docs/              # @ai-tui/docs - Next.js documentation site
├── packages/
│   ├── core/              # @ai-tui/core - Core React components
│   ├── components/        # @ai-tui/components - Shared React utilities
│   └── tsconfig/          # @ai-tui/tsconfig - Shared TypeScript configs
```

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [Biome](https://biomejs.dev/) for code linting and formatting (via Ultracite)
- [Changesets](https://github.com/changesets/changesets) for versioning and publishing

### Useful commands

- `pnpm build` - Build all packages and the docs site
- `pnpm dev` - Develop all packages and the docs site
- `pnpm check` - Lint all packages
- `pnpm fix` - Fix linting issues
- `pnpm changeset` - Generate a changeset
- `pnpm clean` - Clean up all `node_modules` and `dist` folders

## Versioning and Publishing packages

Package publishing has been configured using [Changesets](https://github.com/changesets/changesets). Please review their [documentation](https://github.com/changesets/changesets#documentation) to familiarize yourself with the workflow.

This repo includes automated npm releases via GitHub Actions. To get this working, you will need to:

1. Create an `NPM_TOKEN` secret in your repository settings
2. Optionally install the [Changesets bot](https://github.com/apps/changeset-bot) on your GitHub repository

### Publishing workflow

1. Make changes to packages
2. Run `pnpm changeset` to create a changeset describing your changes
3. Commit and push to `main`
4. GitHub Actions will create a "Version Packages" PR
5. Merge the PR to publish to npm

### npm

Packages are published to the public npm registry under the `@ai-tui` scope:

- `@ai-tui/core` - Core React components
- `@ai-tui/components` - Shared React utilities

To publish packages to a private npm organization scope, **remove** the following from each of the `package.json`'s:

```diff
- "publishConfig": {
-  "access": "public"
- },
```

## Deployment

### Docs (Vercel)

The docs app (`@ai-tui/docs`) is configured for deployment on Vercel:

- **Framework:** Next.js
- **Root Directory:** `apps/docs`
- **Build Command:** `cd ../.. && pnpm turbo run build --filter=@ai-tui/docs`
- **Install Command:** `cd ../.. && pnpm install`
