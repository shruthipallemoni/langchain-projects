/*
  ChatInterface.jsx — Chat Messages + Input Component
  ─────────────────────────────────────────────────────
  This is the main Q&A interface. It:
  - Displays the chat history (user questions + AI answers)
  - Has a text input for typing new questions
  - Shows a "typing..." animation while the AI is generating
  
  Props:
  - messages: array of { role: "user"|"assistant", content: string }
  - onSendMessage: function to call when user submits a question
  - isStreaming: boolean — true while AI is typing
  - messagesEndRef: a React ref used to scroll to the bottom
*/

import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble"; // Individual message display

function ChatInterface({ messages, onSendMessage, isStreaming, messagesEndRef }) {
  
  // Local state for the question input field
  // We keep this here (not in App) because it's only needed by this component
  const [inputText, setInputText] = useState("");

  // Ref for the textarea DOM element (to auto-resize it)
  const textareaRef = useRef(null);

  /*
    Auto-resize textarea as user types.
    We reset the height first (to "auto") then set it to the scroll height.
    This makes it expand down as the user types more lines.
  */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";           // Reset
      textareaRef.current.style.height = 
        Math.min(textareaRef.current.scrollHeight, 150) + "px"; // Expand up to 150px
      // Math.min prevents it from growing infinitely — caps at 150px height
    }
  }, [inputText]); // Run this effect every time inputText changes

  // ── Submit Handler ────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) return; // Don't send empty or while streaming

    onSendMessage(trimmed);  // Call the function passed from App.jsx
    setInputText("");         // Clear the input after sending

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // ── Keyboard Handler ──────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    // Enter without Shift = submit
    // Enter + Shift = newline (default textarea behavior)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent the default "add newline" behavior
      handleSubmit();
    }
    // e.shiftKey is true if the user is holding Shift
  };

  // Suggested questions to help users get started
  const suggestions = [
    "What is this video about?",
    "Summarize the key points",
    "What are the main takeaways?",
    "Explain the most important concept",
  ];

  return (
    <div className="chat-interface">
      
      {/* ── Messages Area ─────────────────────────────────────────────────── */}
      <div className="messages-area">
        
        {/* Map over messages array to render each bubble */}
        {messages.map((message, index) => (
          /*
            .map() transforms each element of an array into JSX.
            The key prop helps React identify which items changed (required for lists).
            We use index as the key — fine for a chat that only adds messages.
          */
          <MessageBubble
            key={index}
            role={message.role}
            content={message.content}
            isStreaming={isStreaming && index === messages.length - 1 && message.role === "assistant"}
            /*
              isStreaming is true for this bubble only if:
              1. Currently streaming
              2. This is the last message
              3. It's an assistant message
              This shows the typing cursor only on the latest AI response.
            */
          />
        ))}
        
        {/* 
          This empty div is our scroll target.
          messagesEndRef.current.scrollIntoView() in App.jsx scrolls to here.
        */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggestion Pills (shown when no user messages yet) ─────────────── */}
      {messages.length <= 1 && (
        /*
          messages.length <= 1 means only the welcome message exists.
          We show quick-start suggestions to help the user know what to ask.
        */
        <div className="suggestions">
          <p className="suggestions-label">Try asking:</p>
          <div className="suggestion-pills">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                className="suggestion-pill"
                onClick={() => onSendMessage(suggestion)}
                /* Clicking a suggestion sends it directly as a question */
                disabled={isStreaming}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input Area ────────────────────────────────────────────────────── */}
      <div className="input-area">
        <div className="input-container">
          
          {/* Textarea instead of <input> because questions can be multi-line */}
          <textarea
            ref={textareaRef}          /* Connect to our ref for auto-resize */
            className="question-input"
            placeholder={isStreaming ? "AI is thinking..." : "Ask a question about this video..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}     /* Can't type while streaming */
            rows={1}                   /* Start with single line height */
          />
          
          {/* Send button */}
          <button
            className={`send-btn ${isStreaming ? "send-btn-loading" : ""}`}
            /* Template literal class name: adds "send-btn-loading" class when streaming */
            onClick={handleSubmit}
            disabled={isStreaming || !inputText.trim()}
          >
            {isStreaming ? (
              /* Animated spinner SVG while streaming */
              <svg className="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            ) : (
              /* Send arrow icon when idle */
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
        
        {/* Helper text below the input */}
        <p className="input-hint">
          {isStreaming ? "Generating answer..." : "Press Enter to send • Shift+Enter for new line"}
        </p>
      </div>
    </div>
  );
}

export default ChatInterface;