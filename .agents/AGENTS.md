# Security and Environment Variable Rules

## Secret Protection
- **NEVER** commit real API keys, passwords, database credentials, JWT secrets, or tokens into Git.
- Real environment secrets MUST ONLY reside in local un-tracked `.env.local` files or secure hosting provider settings (e.g. Vercel Environment Variables).
- `.env.example` MUST only contain dummy placeholder values (e.g. `GROQ_API_KEY=your_groq_api_key_here`).
- Ensure `.env.local`, `.env`, and `*.local` remain listed in `.gitignore`.

## Codebase Ground Truth Rule
- **ALWAYS** inspect the actual application source code, services, database models, and components directly before making changes or writing UI copy. Never infer functionality from generic specs or stale documentation.

