# LeetMentor UI Development Guide

## 🎨 Using Tailwind CSS in Chrome Extension

I've successfully refactored the standalone content script to use **Tailwind CSS** and **React components** for a much cleaner development experience!

## 🏗️ What's New

### ✅ Clean UI Components
- **React-based components** with TypeScript
- **Tailwind CSS** for styling (no more inline styles!)
- **Reusable component library** for consistent UI
- **Better development experience** with hot reload

### ✅ Development Interface
- **Live UI testing interface** at `src/content/ui-test.html`
- **Component playground** to test UI without LeetCode
- **Visual feedback** and animations
- **Easy iteration** on UI designs

### ✅ Improved Build Process
- **CSS processing** in webpack builds
- **Separate standalone build** with `npm run build:standalone`
- **Development mode** with `npm run dev:ui`

## 🚀 Getting Started

### 1. Test the UI Interface

```bash
# Start a local server to test the UI
npm run test-ui

# Then open in browser:
# http://localhost:8000/ui-test.html
```

This opens a development interface where you can:
- See the LeetMentor interface in a clean environment
- Test animations and interactions
- Develop UI components without LeetCode dependencies
- Iterate quickly on design changes

### 2. Build the Standalone Version

```bash
# Build just the standalone content script
npm run build:standalone

# Or build everything including standalone
npm run build
```

### 3. Development Mode

```bash
# Watch mode for standalone development
npm run dev:ui
```

## 📁 New File Structure

```
src/content/
├── components/           # 🎨 New React components
│   ├── InterviewHeader.tsx
│   ├── ProblemInfo.tsx
│   ├── ActionButtons.tsx
│   ├── ChatInterface.tsx
│   └── StandaloneInterface.tsx
├── styles.css           # 🎨 Tailwind + custom styles
├── ui-test.html         # 🧪 Development interface
├── standalone-react.tsx # 🚀 New React-based script
└── content-standalone.ts # 📦 Old vanilla JS (kept for reference)
```

## 🎯 Key Improvements

### Before (Vanilla JS)
```javascript
// 2000+ lines of inline styles and DOM manipulation
interviewInterface.innerHTML = `
  <div style="
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    padding: 0;
    margin: 24px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    // ... 100+ more lines of inline styles
  ">
`;
```

### After (React + Tailwind)
```tsx
// Clean, maintainable components
<div className="leetmentor-gradient rounded-3xl p-0 m-6 shadow-2xl border border-white/10 relative z-50 overflow-hidden">
  <InterviewHeader status="ready" onSettingsClick={handleSettingsClick} />
  <ProblemInfo title={title} difficulty={difficulty} />
  <ActionButtons onStartInterview={handleStartInterview} />
</div>
```

## 🛠️ Component API

### InterviewHeader
```tsx
<InterviewHeader
  title="LeetMentor"
  subtitle="AI Interview Assistant"
  status="ready" | "active" | "paused" | "error"
  onSettingsClick={() => {}}
/>
```

### ProblemInfo
```tsx
<ProblemInfo
  title="Two Sum"
  difficulty="Easy" | "Medium" | "Hard"
/>
```

### ActionButtons
```tsx
<ActionButtons
  onStartInterview={() => {}}
  onSettingsClick={() => {}}
  isInterviewActive={false}
/>
```

### ChatInterface
```tsx
<ChatInterface
  messages={messages}
  onSendMessage={(msg) => {}}
  onClearChat={() => {}}
  onExportChat={() => {}}
  isVisible={true}
  isTyping={false}
/>
```

## 🎨 Styling Guide

### Custom Tailwind Classes

```css
/* In src/content/styles.css */
.leetmentor-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.leetmentor-button-primary {
  @apply bg-gradient-to-r from-green-500 to-emerald-600 text-white border-none rounded-2xl font-bold cursor-pointer transition-all duration-300 ease-out shadow-lg shadow-green-500/30 border border-white/20 hover:shadow-xl hover:shadow-green-500/40 hover:scale-105 active:scale-95;
}

/* And many more utility classes! */
```

### Color Scheme
- **Primary**: Purple gradient (`#667eea` to `#764ba2`)
- **Success**: Green gradient (`#22c55e` to `#16a34a`)
- **Accent**: Blue (`#3b82f6` to `#2563eb`)
- **Glass effect**: `backdrop-blur-xl` with `bg-white/10`

## 🔄 Migration Benefits

### ✅ Better DX
- **Hot reload** during development
- **Type safety** with TypeScript
- **Component reusability** across the extension
- **Consistent styling** with Tailwind

### ✅ Easier Maintenance
- **Smaller bundle size** with Tailwind purging
- **No CSP issues** (styles are bundled)
- **Better debugging** with React DevTools
- **Cleaner code** with component separation

### ✅ Future-Proof
- **Scalable architecture** for new features
- **Easy theming** with Tailwind CSS variables
- **Component library** for other parts of the extension
- **Better testing** with isolated components

## 🚀 Next Steps

1. **Test the UI interface** - Open `src/content/ui-test.html` to see the new interface
2. **Build and test** - Use `npm run build:standalone` to create the new version
3. **Iterate on components** - Modify the React components for better UX
4. **Add more features** - The component architecture makes adding new features much easier!

## ❓ Troubleshooting

### CSS not loading?
- Make sure you're importing `styles.css` in your React component
- Check that PostCSS and Tailwind are properly configured in webpack

### Components not updating?
- Use `npm run dev:ui` for hot reload during development
- The development interface auto-refreshes on changes

### Build errors?
- Run `npm run type-check` to check for TypeScript errors
- Make sure all React dependencies are installed

## 🎉 Conclusion

This refactor transforms your "vibe-coded" interface into a **maintainable, scalable React application** with **professional-grade styling** using Tailwind CSS. The development experience is now much better, and you can easily iterate on the UI design!

The UI testing interface gives you a **sandbox environment** to develop components without dealing with LeetCode's complex DOM structure, making the development process much more enjoyable and efficient.
