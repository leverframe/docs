# leverframe/docs

Documentation site for the Leverframe agent-infrastructure stack.

**Live:** https://docs.leverframe.dev

Sections:

| Section | Product | Repo |
|---|---|---|
| `/fleet-bridge` | fleet-bridge — bridge OpenClaw/Hermes agents to any MCP client | [leverframe/fleet-bridge](https://github.com/leverframe/fleet-bridge) |
| `/wranglebot` | wranglebot — deterministic guardrails, loop-breaking, .curt emission | [leverframe/wranglebot](https://github.com/leverframe/wranglebot) |
| `/tractum` | tractum — verifiable multi-agent consensus with cryptographic receipts | [leverframe/tractum](https://github.com/leverframe/tractum) |

## Local development

```bash
npm install
npm start        # dev server
npm run build    # production build to build/
```

## Deployment

Cloudflare Pages project `leverframe-docs` builds `main` on push
(build command `npm run build`, output `build`), served at docs.leverframe.dev.

## License

MIT. Product docs describe software under its own license — see each repo.
