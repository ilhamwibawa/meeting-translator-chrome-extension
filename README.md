# Meeting Video to Text Extension

A TypeScript Chrome extension that captures audio from meeting video streams and converts it to real-time text transcription.

## Features

- 🎥 **Multi-Platform Support**: Works with Google Meet, Zoom, Microsoft Teams, and generic video platforms
- 🎵 **Audio Extraction**: Advanced audio stream processing with Web Audio API
- 🗣️ **Speech Recognition**: Real-time speech-to-text using Web Speech API
- 📝 **Live Transcription**: Display transcripts in customizable overlay
- 🎨 **Customizable UI**: Draggable panels, themes, and display options
- 🚀 **High Performance**: Optimized for minimal impact on meeting performance

## Installation

### Development Setup

1. **Clone and Install Dependencies**

   ```bash
   cd translator-ext
   npm install
   ```

2. **Build the Extension**

   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `dist` folder
   - Verify the extension loads without errors

**Note:** Make sure to select the `dist/` folder, not the root project folder. If you encounter errors, run `npm run build` first to ensure all files are properly generated.

### Production Build

```bash
npm run build
npm run package
```

## Development

### Available Scripts

- `npm run dev` - Build and watch for changes
- `npm run build` - Production build
- `npm run type-check` - TypeScript type checking
- `npm run lint` - ESLint code linting
- `npm run test` - Run tests
- `npm run clean` - Clean build artifacts

### Project Structure

```
src/
├── types/           # TypeScript type definitions
├── core/            # Core functionality classes
├── content/         # Content script entry point
├── background/      # Service worker/background script
├── ui/              # UI components and styles
├── utils/           # Utility functions and helpers
└── config/          # Configuration files
```

### Core Components

#### VideoDetector

Detects and monitors video elements across different meeting platforms.

#### AudioExtractor

Extracts audio streams from video elements using multiple methods.

#### SpeechProcessor

Processes audio and converts speech to text using Web Speech API.

#### TextDisplayer

Manages the display of transcribed text in overlays.

## Usage

1. **Join a Meeting**: Navigate to a supported meeting platform
2. **Auto-Detection**: Extension automatically detects video streams
3. **Start Transcription**: Click the extension icon or use keyboard shortcuts
4. **View Transcript**: Real-time text appears in the overlay
5. **Customize**: Adjust settings, positioning, and appearance

### Keyboard Shortcuts

- `Alt+T` - Toggle transcription on/off
- `Alt+O` - Toggle transcript overlay
- `Alt+C` - Clear transcript
- `Alt+E` - Export transcript
- `Alt+P` - Toggle control panel

## Supported Platforms

- **Google Meet** (meet.google.com)
- **Zoom** (zoom.us, \*.zoom.us)
- **Microsoft Teams** (teams.microsoft.com)
- **Generic Video Platforms** (fallback support)

## Technical Details

### Architecture

The extension uses a modular architecture with clear separation of concerns:

- **Content Scripts**: Injected into meeting pages for DOM interaction
- **Background Service**: Handles permissions, tab management, and coordination
- **Core Classes**: Specialized classes for video detection, audio processing, and speech recognition
- **UI Components**: Draggable, customizable interface elements

### Performance Optimizations

- **Debounced DOM Monitoring**: Efficient video element detection
- **Audio Stream Pooling**: Reuse audio processing resources
- **Memory Management**: Automatic cleanup and garbage collection
- **Throttled Updates**: Optimized UI refresh rates

### Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Opera 74+ (Chromium-based)

## Configuration

### Default Settings

```typescript
{
  autoStart: true,
  showOverlay: true,
  language: 'en-US',
  theme: 'auto',
  confidenceThreshold: 0.6,
  enableInterimResults: true
}
```

### Audio Processing

```typescript
{
  sampleRate: 16000,
  channelCount: 1,
  chunkSize: 4096,
  enableNoiseReduction: true
}
```

## Troubleshooting

### Common Issues

1. **No Audio Detected**

   - Check microphone permissions
   - Ensure meeting has audio enabled
   - Try refreshing the page

2. **Poor Recognition Accuracy**

   - Check audio quality settings
   - Adjust confidence threshold
   - Try different language settings

3. **Performance Issues**
   - Close unnecessary browser tabs
   - Check CPU usage in Task Manager
   - Disable other extensions temporarily

### Debug Mode

Enable debug logging in extension settings or browser console:

```javascript
// Enable debug logging
localStorage.setItem(
  "mvtt-logger-settings",
  JSON.stringify({
    logLevel: "debug",
    enableConsoleOutput: true,
  })
);
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow semantic versioning

## Privacy

This extension:

- ✅ Processes audio locally in your browser
- ✅ Does not send data to external servers
- ✅ Uses standard Web APIs for speech recognition
- ✅ Stores settings locally only

## License

MIT License - see [LICENSE](LICENSE) for details.

## Changelog

### v1.0.0 (Initial Release)

- Multi-platform video detection
- Real-time speech-to-text transcription
- Customizable UI components
- Audio stream processing
- Performance optimizations

## Support

For issues, questions, or feature requests:

- Create an [issue](https://github.com/your-repo/issues)
- Check the [troubleshooting guide](#troubleshooting)
- Review existing [discussions](https://github.com/your-repo/discussions)

## Roadmap

- [ ] Speaker identification
- [ ] Multiple language support
- [ ] Export formats (PDF, Word)
- [ ] Cloud backup options
- [ ] Team collaboration features
- [ ] Mobile platform support
