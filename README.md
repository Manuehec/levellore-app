# LevelLore App

This repository contains a Node/Express server and static client for the LevelLore community site. Features include user registration and login with username/password (no email), a daily XP system with leveling, a SpongeBob trivia quiz that rotates daily, avatar upload, and a chat room for registered users.

## Structure

- `server/` — Node/Express backend with REST API endpoints for registration, login, XP award, quiz, chat and avatar upload.
- `client/` — HTML, CSS and JavaScript frontend built without a build system. It consumes the API and manages UI/UX.
- `Dockerfile` — Containerization instructions to run the app in a Node environment.
- `render.yaml` — Configuration file for deploying the project on Render as a Docker web service.

## Running locally

```
# Install dependencies and start the server
cd server
npm install
node server.js
```

Then open `client/index.html` in your browser or let the server serve it at `http://localhost:3000`. Adjust the CORS settings in `server/server.js` if necessary.
