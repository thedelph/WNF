# WNF (Wednesday Night Football)

A web application for managing weekly football (soccer) games, player registrations, team balancing, and player statistics.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Daisy UI
- **Animations**: Framer Motion
- **Backend**: Supabase (Auth and Database)
- **Notifications**: React Hot Toast
- **Analytics**: Vercel Analytics

## Key Features

- Player registration and profile management
- XP-based player selection system
- Automatic team balancing based on player ratings
- Player statistics and performance tracking
- Admin portal for game management
- Player rating system
- Collectable card-style player profiles with rarity tiers

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
