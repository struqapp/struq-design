# Security

## Reporting a problem

Please do not open a public issue. Report it privately through
[a security advisory](https://github.com/struqapp/struq-design/security/advisories/new), or by mail to
[support@struq.nl](mailto:support@struq.nl). Security reports are read before anything else.

This covers the skill in this repository, the installer published as `@struq/skill`, and the Struq MCP at
`https://struq.app/api/mcp`.

## What the skill does on your machine

The skill is instructions, block files and a few small Node scripts that your agent runs in your project. The
[README](README.md#what-it-fetches-and-sends) lists everything it fetches and sends. In short:

- The installer downloads the package from npm and copies the skill into your AI tools' folders. It sends nothing.
- `images.mjs` downloads photos from Struq's public photo packs. Nothing else is fetched to build a site.
- The Struq MCP is optional. When you connect it, your agent sends your brief to its tools, signed in as you.

## Supported versions

Only the latest release gets fixes. Run `npx @struq/skill@latest` to update.
