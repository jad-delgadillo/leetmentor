# LeetMentor 🎯

AI-powered Chrome extension for LeetCode interview practice with real-time voice interaction.

## Features

- 🎤 **Voice Conversation**: Practice interviews with AI using speech recognition and text-to-speech
- 🤖 **Smart AI Interviewer**: Powered by ChatGPT for realistic interview experiences
- 🎯 **LeetCode Integration**: Automatically detects LeetCode problems and starts practice sessions
- 📊 **Detailed Feedback**: Get comprehensive performance analysis after each session
- ⚙️ **Customizable Settings**: Adjust difficulty, voice settings, and practice areas
- 🎨 **Beautiful UI**: Modern, responsive interface built with React and Tailwind CSS

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Chrome browser
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd leetmentor
   npm install
   ```

2. **Build the extension**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the `dist` folder

4. **Configure your API key**
   - Click the LeetMentor extension icon
   - Go to Settings and enter your OpenAI API key
   - Choose your preferred voice and interview settings

5. **Start practicing!**
   - Navigate to any LeetCode problem page
   - Click "Start Interview Practice" button that appears
   - Begin your AI-powered interview session

### 🚀 ChatGPT Mobile Experience (Optional)

For the **ultimate real-time voice experience** with streaming conversation:

1. **Setup backend server:**
   ```bash
   cd backend
   npm install
   cp env.template .env
   # Edit .env and add your OPENAI_API_KEY
   npm run dev
   ```

2. **Enable Realtime mode:**
   - Toggle the "Realtime" button in the extension
   - Enjoy ChatGPT mobile-level voice conversations!

**Note:** Requires the backend server for WebSocket proxy to OpenAI Realtime API.

## Development

### Available Scripts

```bash
npm run dev          # Development build with watching
npm run build        # Production build
npm run clean        # Clean dist folder
npm run type-check   # TypeScript type checking
npm run lint         # ESLint checking
npm run format       # Prettier code formatting
```

### Project Structure

```
src/
├── background/      # Chrome extension background script
├── content/         # Content script for LeetCode integration
├── popup/           # Extension popup interface
├── interview/       # Full-screen interview interface
├── shared/          # Shared utilities and services
└── types/           # TypeScript type definitions
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build System**: Webpack 5 with hot reload
- **AI Integration**: OpenAI GPT-4/3.5 API
- **Voice Features**: Web Speech API (Speech Recognition & Synthesis)
- **Chrome APIs**: Extension, Storage, Tabs, Scripting

## Features in Detail

### 🎤 Voice Interaction
- Real-time speech recognition for natural conversation
- Text-to-speech for AI responses
- Configurable voice settings (speed, pitch, language)
- Visual feedback for speaking/listening states

### 🤖 AI Interviewer
- Contextual questions based on the specific LeetCode problem
- Adaptive difficulty levels (Beginner, Intermediate, Advanced)
- Realistic interview flow with follow-up questions
- Code review and optimization suggestions

### 📊 Performance Analytics
- Communication skills assessment
- Problem-solving approach evaluation
- Time management analysis
- Detailed feedback with improvement suggestions

## Configuration

The extension stores settings locally and supports:

- **API Settings**: OpenAI API key and model selection
- **Voice Settings**: Language, speech rate, pitch, volume
- **Interview Settings**: Difficulty level, practice areas
- **Accessibility**: Speech recognition sensitivity, voice feedback

## Privacy & Security

- All data is stored locally in your browser
- API calls are made directly to OpenAI (no intermediary servers)
- No personal data is collected or transmitted to third parties
- Open source for full transparency

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

## License

MIT License - see LICENSE file for details

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/username/leetmentor/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/username/leetmentor/discussions)

---

**Happy interviewing! 🚀**
