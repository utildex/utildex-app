
# Contributing Articles to Utildex

Utildex features a built-in article reader that supports Markdown rendering, syntax highlighting, and internationalization (i18n).

This guide explains how to add new articles or translate existing ones.

---

## 📂 Architecture

Articles are loaded on-demand via HTTP to keep the application lightweight.

1.  **Registry (`src/data/article-registry.ts`)**: Defines metadata (Title, Author, Date, Tags) which is bundled with the app for instant lists/searching.
2.  **Content Files (`public/assets/articles/{id}/{lang}.md`)**: Separate Markdown files that are lazy-loaded when the user opens an article.

---

## 🚀 Step-by-Step Guide

### 1. Define Metadata
Open `src/data/article-registry.ts` and add a new entry to the `ARTICLE_REGISTRY` array.

**Key Requirements:**
*   **id**: A unique, kebab-case string (e.g., `'my-new-feature'`).
*   **type**: `'internal'` for articles hosted within the app, `'external'` for links to other websites.

```typescript
{
  id: 'mastering-typescript',
  type: 'internal',
  title: {
    en: 'Mastering TypeScript',
    fr: 'Maîtriser TypeScript'
  },
  summary: {
    en: 'A deep dive into advanced types.',
    fr: 'Une plongée dans les types avancés.'
  },
  thumbnail: 'https://picsum.photos/id/1/800/600',
  date: '2026-01-01', // ISO Format
  tags: ['Dev', 'TypeScript'],
  author: 'John Doe',
  featured: true, 
  readingTime: 5
}
```

### 2. Create Content Files
Create a new folder in `public/assets/articles/` matching your article ID.
Inside that folder, create a Markdown file for each supported language code (e.g., `en.md`, `fr.md`).

**Structure:**
```
public/
  assets/
    articles/
      mastering-typescript/
        en.md
        fr.md
```

**Example Content (`en.md`):**
```markdown
# Mastering TypeScript

TypeScript is awesome. Here is why...

## Generics

```typescript
function identity<T>(arg: T): T {
  return arg;
}
```
```

---

## ✍️ Markdown Guidelines

The reader uses `marked` for parsing and `PrismJS` for syntax highlighting.

*   **Headings:** Start with `#` (H1).
*   **Code Blocks:** Use triple backticks with the language identifier.
*   **Images:** `![Alt Text](https://example.com/image.png)`

---

## 🌍 Internationalization (i18n)

*   **Fallback:** If a user views an article in a language that doesn't exist (e.g., Spanish), the system will automatically attempt to load the English version (`en.md`).
