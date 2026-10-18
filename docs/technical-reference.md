# Gisul skills

Private authoring source for workflow skills served by the gisul MCP server.
The code repository is [changeroa/gisul](https://github.com/changeroa/gisul).

`skills/` contains the imported content, with file bytes verified against the
remote server's resource manifests. `migration/import.json` records the source
URIs. `aliases.json` maps adopted `codex` URIs to canonical `gisul` URIs.
Importing content does not change the live server or delete its current roots.

```sh
npm ci
npm run validate
npm test
```

The validator independently implements the server's discovery rules: LF YAML
frontmatter with nonempty string `name` and `description`, name matching the final
directory component, at most 512 visible regular files and 16 MiB per skill.
Hidden entries and `node_modules` are ignored; internal symlinks are not followed.
The configured root itself may be a symlink. A symlinked `SKILL.md` is invalid.

Descriptions longer than 1,024 characters, missing Korean/English discovery
keywords, and unresolved Markdown links into `references/`, `scripts/`, or
`assets/` are warnings. They do not silently change imported content or disagree
with the server's eligibility rules. Invalid skills cause a nonzero exit.

The top-level `keywords` array is a gisul discovery extension. The pinned
producer `02d782d61d062d503a2992214f254f7f20b0a3ad` consumes it in
`server/src/codex.ts`; that bridge does not index a `metadata.keywords` string.
Moving the terms there alone loses keyword-only search matches. Skills using
this extension are not claimed to pass strict external Agent Skills validators:
the reference `skills-ref` validator rejects the array's YAML flow syntax and
does not allow an extra top-level `keywords` field. A portable export would need
standard string-valued metadata and a corresponding consumer update before
relying on the same gisul search behavior.

The integration test compares valid and skipped skill directories with the real
server, including malformed frontmatter, limits, and symlink cases. Set
`GISUL_SERVER_PATH` to the server's compiled `dist/index.js` when running it.

Remote skills remain instructions and supporting data. Import and validation do
not execute scripts contained in a skill.
