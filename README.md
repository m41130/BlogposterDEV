
# BlogposterCMS (Yes, Another CMS — Because Clearly We Don’t Have Enough)

*Disclaimer (in the spirit of 100% sarcasm and critical thinking):*  
We’re obviously biased toward Node.js, modular designs, and the notion that security is more than just a good idea. Take every claim below with a grain of salt. Who knows if our sources are credible? We sure don’t. But hey, at least we’re acknowledging our potential bias, right?

BlogposterCMS is a modern, modular Node.js content management system built with “security and flexibility” in mind. (Because, of course, there’s never been a Node.js project that claimed otherwise.) It aims to serve everyone from small content creators to enterprise developers by providing a highly customizable architecture — presumably without compromising on stability or security. This project is open-source (MIT licensed) and currently under *active* development (if you believe our hype). The core backend features are in place, with a full front-end and more on the way. Trust us, it’s definitely worth the wait.

## Key Features

1. **Modular Architecture**  
   Every feature is a module. The core CMS itself is composed of modules (for users, pages, settings, etc.), and you can add or remove modules as needed. This plug-in style design makes the system *extremely* extensible — you can develop custom modules to introduce new functionality or modify existing behavior in an isolated way. Modules are loosely coupled and communicate through defined interfaces, ensuring that adding new features won’t break the whole system. Because *no one* has ever promised that before.

2. **JWT-Secured Event System**  
   Internal communication runs through a central event bus secured by JSON Web Tokens. BlogposterCMS uses a tiered trust level system for tokens (e.g. high-trust for core and admins, lower trust for plugins and public calls) to ensure only authorized code can perform sensitive actions. All core operations and module interactions occur via event emitters (“meltdown” events — because meltdown is always reassuring). The `motherEmitter` (the main event dispatcher) validates JWTs on every event, enforcing permissions and preventing rogue modules from executing unauthorized tasks. If a module tries something fishy or an error is thrown, the system can halt it via this event system *before it causes any harm*. (Sure, that definitely covers every possible scenario.)

3. **Flexible Authentication Strategies**  
   BlogposterCMS supports multiple authentication methods out of the box. Traditional email/password login is augmented with OAuth integrations — for example, you can enable Google sign-in for users. The architecture is designed to accommodate additional providers easily, including upcoming support for *innovative* strategies (because marketing buzzwords, obviously). All authentication ultimately issues secure JWT tokens so that subsequent requests and module actions are all verified. Because *yet another* token-based flow is clearly the future.

4. **Multi-Database Support (MongoDB & PostgreSQL)**  
   You can run BlogposterCMS with either PostgreSQL or MongoDB as the storage engine, simply by changing a config setting. PostgreSQL is the default, but if you prefer a NoSQL approach, switching to MongoDB is fully supported. The Database Manager module provides an abstraction layer so modules can perform database operations without worrying about the underlying engine. It even allows each module to use its own isolated database/schema if configured, or to share a common database with separate collections/schemas per module. Because more complexity always equals more fun.

5. **Containerized Module Sandbox**  
   All community/third-party modules run in a sandboxed environment managed by the Module Loader. This is akin to containerizing plugins — a misbehaving module cannot crash the whole CMS (well, we *think* it can’t). Each module must declare its dependencies and interacts with the system only via approved event APIs. If a module encounters an error or tries to perform an illegal operation, BlogposterCMS’s automatic error handling will catch it and immediately deactivate that module. This “fail-safe” design (the meltdown mechanism) ensures stability: one faulty plugin won’t bring down your entire site. (Fingers crossed.)

6. **Security First Approach**  
   (Beyond JWT and sandboxing) BlogposterCMS layers multiple security measures. It uses salted tokens and robust middleware to ensure only authorized users and modules access data. The permissions system is granular (admins even have a wildcard `*` permission capability for full control, while other roles are restricted). Security-related settings are centralized, and best practices (like secure headers, HTTPS enforcement, etc.) are built in by default. Upcoming security patches (see roadmap) will continue to *harden* the platform, but even in the current state, the CMS is built to significantly reduce common vulnerabilities that plague traditional CMS platforms. (Allegedly.)

7. **Configuration & Feature Toggles**  
   You can turn major features or modules on/off through configuration without touching code. A layered config system (environment variables, runtime config files, secrets files, etc.) allows deep customization of how your CMS runs in different environments. For example, enabling/disabling a feature module or switching authentication modes is as simple as updating a config file. This makes BlogposterCMS *adaptable* — suitable for a simple blog or a complex site — by toggling features appropriate to your needs.

8. **(Experimental) Microservice Support**
   Because we apparently *need* more complexity, BlogposterCMS is laying the foundation to run individual modules on separate servers. Yes, you can soon scatter your modules all over the place, so that if one server crashes, you can chase down the error in yet another location. But rest assured, the fundamental scaffolding is already in place! Because who doesn’t love microservices?

9. **Public Settings & Registration**
   The `getPublicSetting` event exposes only whitelisted keys (such as `FIRST_INSTALL_DONE`) so the front-end can check installation state without elevated permissions. Alongside the `publicRegister` event, users can self-register while the system keeps admin-only settings private.

*(More core features like a widget system, media management, and internationalization are also in progress, thanks to the modular design. As development continues, these will be fleshed out as separate modules… if we don’t get bored first.)*

## Roadmap

The project is in active development. Below is the roadmap of upcoming features and improvements, in the order they are *allegedly* planned to be implemented (totally set in stone, right?):

1. **Full Front-End UI (Coming Next)**  
   The next milestone is a complete front-end interface for BlogposterCMS. This will include an intuitive admin dashboard and editing UI, so you can manage content, settings, and modules through a web interface (no more editing config files!). The goal is to make the CMS user-friendly for non-developers (because we’re definitely known for that) by providing a clean React/Vue (TBD) front-end for all core functions.

2. **Security Patches and Hardening**  
   Following the UI, the team will focus on refining security. This includes auditing the code for vulnerabilities, improving encryption/hashing mechanisms, adding rate-limiting where needed, and patching any security gaps identified during early testing. Security is a cornerstone of BlogposterCMS, so continuous improvements here are a high priority. (We know, you’ve heard it all before.)

3. **Integrated Analytics Module**  
   A built-in analytics and reporting module is planned, so users can track site traffic, content performance, and other key metrics from within BlogposterCMS. Instead of relying on external analytics, the CMS will offer an optional analytics dashboard module for insights into your content and audience. This *might* include page view statistics, referral sources, and possibly integration with Google Analytics or a privacy-friendly alternative. Because *why not*?

4. **AI Integration (ChatGPT-Powered Features)**  
   BlogposterCMS plans to leverage AI (ChatGPT, of course) to enhance the content creation and management experience. This could mean features like AI-assisted content generation, intelligent content recommendations, auto-tagging/categorization, or chatbot integration. The exact feature set is in development, but the idea is to integrate OpenAI’s capabilities to provide “smart” tools for creators right in the CMS. (What could possibly go wrong?)

5. **Plugin/Module System Finalization**  
   While the core modular architecture is already implemented, this phase will polish and finalize the plugin system for third-party developers. Expect improvements in documentation, clearer APIs, and possibly a marketplace or directory for community modules. The goal is to make writing and installing plugins/modules as seamless as it is in platforms like WordPress, but with BlogposterCMS’s “enhanced security model.” By this stage, the module API will be considered stable. Probably. Maybe.

6. **Core CMS Feature Parity with WordPress Plugins**  
   Finally, the roadmap includes implementing all the major features that users often rely on WordPress plugins for. This means things like SEO tools, rich text editing, media galleries, caching mechanisms, contact forms, etc., will either be built-in or available as first-class modules. Essentially, by the end of this phase, BlogposterCMS aims to cover the same functional needs that a typical WordPress site can handle — but in a more secure, modular fashion. (Because we’re definitely not taking on too much.)

Each of these roadmap items will be developed openly on GitHub (because *transparency*). Your feedback is “welcome” — if a particular upcoming feature is important to you, or you have suggestions, feel free to open an issue or join the discussion. The ordering is subject to change based on community feedback and *random whims*.

## Target Audience

### Independent Content Creators & Bloggers
If you’re a “tech-savvy” blogger or a small website owner dissatisfied with the limitations or bloat of traditional CMS platforms, BlogposterCMS offers a fresh alternative. You get a lightweight core with only the features you need (you can disable modules you don’t use), and the promise of advanced features like AI assistance down the line. Great for those who want more control over their blog’s functionality and security without giving up ease of use (once the front-end UI is in place, of course).

### Agencies and Small Businesses
Web agencies or organizations that build websites for clients will appreciate the modular nature of BlogposterCMS. You can tailor the CMS to each project’s needs by toggling modules on/off or adding custom modules for unique requirements. The strong security model is a selling point for clients who are big on data protection. Plus, it’s Node.js-based, so JavaScript-focused teams can’t resist. It’s an attractive option if you need a self-hosted, extensible CMS that can grow with a client’s needs — because everything else was obviously too mainstream.

### Developers & Open Source Contributors
BlogposterCMS is built by developers, for developers. If you’re interested in Node.js, security, or plugin architectures, this project is your playground. The codebase is open and modular, making it relatively easy to dive into one part without having to understand the entire system. Developers who enjoy building plugins or contributing to open source will find many opportunities here — from writing a new module (like a fancy image gallery) to improving core features. If you’ve ever been frustrated by trying to bend WordPress or another CMS to your will, BlogposterCMS is your chance to build something “better.” The question, of course, is whether you can handle the *bleeding edge*.

In short, BlogposterCMS is for early adopters who aren’t afraid to get their hands dirty with a new platform and who see the value in a “security-first” Node.js CMS. Whether you’re a creator looking for a better blogging tool or a developer looking to contribute to something ambitious, we welcome you! (We totally won’t regret it later.)

## How to Get Started

If you’re *still* ready to try out BlogposterCMS:

1. **Clone the repository**  
   ```bash
   git clone https://github.com/BlogposterCMS/BlogposterCMS.git
````

(Until the project is more “mature,” we recommend using the main branch for the latest features and fixes. Because stable releases are for cowards.)

2. **Install dependencies**

   ```bash
   cd BlogposterCMS && npm install
   ```

3. **Set up configuration**
   Copy `env.sample` to `.env` in the project root. Open the `.env` file and fill in the required settings (like database configuration and JWT secret keys). The sample env file contains comments to guide you. At minimum, generate a secure secret for JWT signing and choose your database (Postgres or Mongo) and credentials.

4. **Run the server**

   ```bash
   npm start
   ```

   This will launch the Node.js server on the port specified in config (default 3000).

5. **Access the CMS**
   Once running, open your browser to [http://localhost:3000/](http://localhost:3000/). At this stage (pre-UI), you’ll primarily see a basic landing or have to interact via API/command line. As the project evolves (seriously, any day now), this URL will present the full admin UI for managing content.

Being an early project, you might need to refer to the source and wiki for how to do certain tasks (like creating an admin user). Feel free to ask questions or open issues if you need help, because we definitely live to serve.

## Contributing

Contributions are *greatly* appreciated! (And totally needed, if we’re honest.) BlogposterCMS is in a phase where feedback and help can shape its direction significantly. There are several ways you can get involved:

1. **Report Issues and Suggestions**
   If you encounter a bug, or if you have an idea for a new feature or improvement, open an issue on GitHub. We use the issue tracker to prioritize tasks and features. Early user feedback is invaluable — especially if it strokes our egos or points out glaring flaws.

2. **Submit Pull Requests**
   Developers, you’re welcome to contribute code. Whether it’s a fix for a bug, an improvement to documentation, or even a new module, we will *happily* review pull requests. If you plan to work on a major feature, it’s a good idea to discuss it in an issue or discussion first so we don’t fight about it later. We have a developer guide in the wiki (“Developing Your Own Modules”) that provides some pointers on the project structure. Please follow the existing code style and test your changes. The maintainers will review your PR and might provide feedback — we strive to be friendly, but hey, we’re only human.

3. **Create Community Modules**
   One of the easiest ways to extend BlogposterCMS is by writing your own module. If you have a great idea that doesn’t belong in the core project, you can implement it as a separate module. Thanks to our modular system, you don’t need to fork the entire codebase — just add a new folder under `modules/` for your feature. Check out the wiki page “Developing Your Own Modules” for a crash course on how modules work (event handlers, `moduleInfo` files, etc.). Then share your module with others or propose it as an official module. The possibilities are endless (until it crashes).

4. **Join the Discussion**
   We’ve enabled GitHub Discussions on the repository. Use it to ask questions, share use-cases, or brainstorm about the CMS. Community input will help shape upcoming features and priorities. Don’t be shy — or do, we won’t judge.

Before contributing, please note that the project is still early-stage. There may be rapid changes (read: *we might break everything at any time*). We recommend checking open issues and the roadmap to see where you can have the most impact. Also, see the [LICENSE](#license) (MIT) to understand the terms — in short, the project is permissively licensed, and contributions are made under the same license.

## Troubleshooting

Occasionally a misconfigured page might request admin widgets when rendered on the public lane. This results in log entries such as:

```
[plainSpace] Error fetching widgets from widgetManager: Forbidden – missing permission: widgets.read
```

If you encounter this, ensure the page configuration does **not** force `widgetLane: 'admin'` for public pages. Public pages should always load widgets from the public lane. When in doubt, remove the `widgetLane` option or explicitly set it to `'public'`.


## License

This project is licensed under the MIT License, meaning you’re free to use, modify, and distribute it as long as you include the license notice. We chose MIT to encourage broad usage and contribution. See the `LICENSE` file for the full text. (Yes, that means you can basically do whatever you want, but hey, don’t blame us if it all goes south.)

## Star, Watch & Spread the Word ⭐

If you find the *vision* of BlogposterCMS exciting or useful, please star this repository on GitHub. It helps us gauge interest and get the project noticed. Also, click “Watch” to get updates — you’ll be notified when there are new releases or ~~earth-shattering~~ important discussions. Early support from the community means a lot; it motivates the maintainers and helps attract more contributors. You can also share the project with others who might be interested. Whether you’re a blogger tired of the status quo or a developer looking for a cool open-source experiment, BlogposterCMS has something *unique* to offer.

Join us on this journey to build a better, more secure, and flexible CMS! Together, we can shape BlogposterCMS into a powerful platform that empowers creators and developers alike. Every star, watch, contribution, or piece of feedback brings us one step closer to that goal. (Seriously, we need all the help we can get.)

*Thank you for checking out BlogposterCMS — we’re *thrilled* (read: mildly terrified) to have you here early, and we can’t wait to see what we all create with it!*

