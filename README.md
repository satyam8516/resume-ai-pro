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

## Development

### Running Tests

The app includes comprehensive unit tests for the sanitization utilities:

```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# Interactive UI for test exploration
npm run test:ui

# Generate coverage report
npm run test:coverage
```

**Test Coverage**: 50+ test cases covering:
- Malformed Unicode escape sequences (`\uZZZZ`, `\u123`)
- Backslash escaping in file paths (`C:\Users`)
- Control characters (newlines, tabs, null bytes)
- Multi-byte UTF-8 (emojis 👋, CJK 你好, accents café)
- Real-world resume scenarios with mixed content

### Local Development

```bash
npm run dev
```

This starts the Vite development server with hot-reload enabled.

## Troubleshooting

### Unicode Escape Sequence Errors

**Problem**: "unsupported Unicode escape sequence" errors when uploading or analyzing resumes.

**Root Cause**: User-uploaded content (resumes, job descriptions) can contain:
- File paths with backslashes: `C:\Users\Documents\resume.pdf`
- Malformed Unicode escapes from PDF extraction: `\uZZZZ` or `\u123`
- Control characters (newlines, tabs, null bytes)
- Mixed valid/invalid escape sequences

When this content is processed by JSON.parse(), JavaScript's strict Unicode validation rejects invalid escape sequences, causing the entire operation to fail.

**Production-Grade Solution**: The app implements a three-phase sanitization pipeline:

1. **Malformed Escape Normalization** (`/\\u(?![0-9a-fA-F]{4})/g`)
   - Detects invalid `\u` sequences (not followed by exactly 4 hex digits)
   - Escapes the backslash: `\uZZZZ` → `\\uZZZZ`
   - Preserves user intent while preventing parse errors

2. **Backslash Escaping** (`/\\(?!\\)/g`)
   - Properly escapes all backslashes for JSON safety
   - Handles file paths: `C:\Users` → `C:\\Users`
   - Prevents double-escaping already-processed sequences

3. **Control Character Conversion** (`/[\u0000-\u001F\u007F-\u009F]/g`)
   - Converts invisible/dangerous characters to `\uXXXX` format
   - Preserves document structure without breaking JSON
   - Maintains data integrity for AI processing

**Where Sanitization Occurs**:
- ✅ Client-side: Before uploading resume text
- ✅ Edge Functions: On all incoming request payloads
- ✅ AI Prompts: Before sending to Lovable AI Gateway
- ✅ Database: When storing job descriptions and resume data

**Multi-byte UTF-8 Safety**: Emojis (👋), CJK characters (你好), accented letters (café), and mathematical symbols (∑) are preserved without modification.

**Testing**: Run `npm test` to verify sanitization handles 50+ edge cases including malformed escapes, international characters, control characters, and real-world resume scenarios.

**Performance**: Sanitization adds <1ms per request and is applied only to user-controlled string inputs, not to all data.
