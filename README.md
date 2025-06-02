# BlogposterCMS

📚 Full documentation lives in [`docs/index.md`](./docs/index.md) – your entry point for installation, architecture, security and developer guides.

> "The last CMS you'll ever fork."  
> BlogposterCMS is what happens when a dev snaps after one too many WordPress updates.

**BlogposterCMS** is a modular, secure-by-design *Node.js CMS* that doesn’t care about trends — only about control.
Every feature is a module. Every module is sandboxed. Every action is validated.
You get the power of plugins — without the plugin drama.

- 🧩 100% modular (every feature is optional)
- 🔐 JWT-secured event system (no rogue code allowed)
- ⚙️ Built-in sandbox for third-party modules (crash protection included)
- 🛡️ Hardened security layer with granular permissions
- 📦 PostgreSQL *or* MongoDB – you choose
- 💠 Drag-and-drop pages thanks to GridStack
- 🧠 AI & Microservices support (because why not?)
- ☢️ Meltdown event bus keeps rogue modules isolated
- 🔑 Dynamic login strategies and secure share links
- 📦 Dependency whitelisting for safe requires

It’s currently in Alpha. No guarantees. No mercy. Full transparency.

---

Looking for actual instructions? Start with the [documentation index](docs/index.md). You'll find guides on installation, configuration, module architecture, developer quickstart and, of course, pages of security notes. Replace those placeholder secrets in `.env` or the event bus will mock you.

Fancy tricks like dynamic login strategies, the meltdown event bus, or safe dependency loading are explained there too. Basically, if you’re looking for details, consult the docs.

BlogposterCMS tries to be secure first, developer friendly second, and user friendly third. If you spot a hole or have a question, open an issue—or a pull request if you’re feeling brave. Have fun!

## License

MIT. Use at your own risk, see [`LICENSE`](LICENSE) for the thrilling legal text.
