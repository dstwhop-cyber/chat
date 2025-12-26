# ob-chat

A private, customizable AI companion chatbot with voice capabilities.

## Features

- 🏠 Local-first architecture (runs entirely on your machine)
- 🔒 Secure authentication with JWT
- 💬 Chat with multiple AI companions
- 🎙️ Text-to-speech with customizable voices
- 🎤 Voice cloning (premium)
- 📞 Real-time voice calls (premium)
- 🌙 Dark/Light mode

## Prerequisites

1. Node.js 18+ and npm
2. [Ollama](https://ollama.ai/) installed and running (default: http://localhost:11434)
3. Python 3.8+ (for TTS features)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd server
   npm install
   
   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both `client` and `server` directories
   - Update the values as needed

4. Initialize the database:
   ```bash
   cd server
   npx prisma migrate dev --name init
   ```

## Running the Application

1. Start the backend:
   ```bash
   cd server
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```bash
   cd client
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

## Development

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## Production Build

```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```

## License

MIT
