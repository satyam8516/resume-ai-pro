# AI Resume Analyzer

A production-quality AI-powered resume analysis application built with React, TypeScript, and Lovable Cloud.

## Project info

**URL**: https://lovable.dev/projects/779d3799-6616-4906-9257-5883756530f1

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/779d3799-6616-4906-9257-5883756530f1) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/779d3799-6616-4906-9257-5883756530f1) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Troubleshooting

### Unicode Escape Sequence Errors

If you encounter "unsupported Unicode escape sequence" errors when uploading resumes or during AI analysis, this is due to special characters (backslashes, control characters, or malformed Unicode sequences) in the resume text.

**How it's fixed:**

The application implements a robust sanitization pipeline that:
- Escapes all backslashes before JSON serialization
- Converts control characters to proper `\uXXXX` format
- Sanitizes text at multiple layers: file upload, edge function input/output, and AI interactions
- Uses proper `Content-Type: application/json; charset=utf-8` headers

The `sanitizeForJson()` utility is applied automatically to all user inputs and AI responses, ensuring JSON-safe data transmission throughout the stack. The implementation includes:

1. **Client-side sanitization** (`src/lib/sanitizeForJson.ts`): Sanitizes extracted resume text and job descriptions before sending to edge functions
2. **Server-side sanitization** (`supabase/functions/_shared/sanitize.ts`): Sanitizes all incoming data and AI prompts in edge functions
3. **Proper JSON handling**: All responses use `JSON.stringify()` and include correct Content-Type headers
4. **UTF-8 encoding**: Files are read as text with UTF-8 encoding to properly handle multi-byte characters
