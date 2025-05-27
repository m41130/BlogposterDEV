# Security Notes

BlogposterCMS was designed with multiple layers of security in mind. While no system is entirely foolproof, following these guidelines will help keep your installation safe.

- **Environment secrets** – Never commit real secret values to version control. Copy `env.sample` to `.env` and provide strong random strings for all salts and tokens.
- **HTTPS** – When running in production, place the app behind HTTPS and set `NODE_ENV=production` to enable secure cookies and redirects.
- **Rate limiting** – The configuration in `config/security.js` defines limits for login attempts to slow down brute-force attacks. Adjust these values according to your needs.
- **CSRF protection** – Admin routes use CSRF tokens to prevent cross-site request forgery. Clients must include the token when authenticating or performing sensitive actions.
- **Module sandboxing** – Optional modules are loaded inside a sandbox. Faulty or malicious modules are deactivated automatically when health checks fail.

Always review your access logs and keep dependencies up to date. Security patches will continue to harden the platform over time.
