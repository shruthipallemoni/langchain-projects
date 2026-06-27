/*
  MessageBubble.jsx — Individual Chat Message Component
  ───────────────────────────────────────────────────────
  Renders a single message bubble in the chat.
  Handles both user messages and assistant (AI) messages differently.
  
  Also handles basic Markdown → HTML rendering for AI responses:
  - **bold** → <strong>bold</strong>
  - *italic* → <em>italic</em>  
  - `code` → <code>code</code>
  - ```...``` → <pre><code>...</code></pre>
  - - bullet → <li>
  
  Props:
  - role: "user" or "assistant"
  - content: the message text (can contain markdown for assistant)
  - isStreaming: boolean — if true, shows a blinking cursor at the end
*/

function MessageBubble({ role, content, isStreaming }) {
  
  const isUser = role === "user";
  // isUser is a simple boolean we'll use for conditional rendering and styling

  /*
    parseMarkdown — converts basic Markdown syntax to HTML.
    
    We're NOT using a library (like react-markdown) to keep dependencies minimal
    and to show you how string replacement works.
    
    .replace(pattern, replacement) replaces regex matches with the given string.
    The replacement can use $1, $2, etc. to reference capture groups from the regex.
  */
  const parseMarkdown = (text) => {
    if (!text) return ""; // Guard: return empty string if no text

    return text
      // ── Code blocks (``` ... ```) — must be done BEFORE inline code ──────
      .replace(/```[\w]*\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      /*
        Regex breakdown: /```[\w]*\n?([\s\S]*?)```/g
        - ``` : literal backticks
        - [\w]* : optional language name (like "python", "js")
        - \n? : optional newline
        - ([\s\S]*?) : capture group 1 — anything (including newlines), non-greedy
        - ``` : closing backticks
        - g flag : replace ALL occurrences (not just the first)
      */

      // ── Inline code (`code`) ──────────────────────────────────────────────
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      /*
        `([^`]+)` matches text between single backticks.
        [^`]+ means: one or more characters that are NOT a backtick.
        $1 in replacement = the text inside the backticks.
      */

      // ── Bold (**text**) ───────────────────────────────────────────────────
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")

      // ── Italic (*text*) ───────────────────────────────────────────────────
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")

      // ── Bullet points (- text or * text at start of line) ─────────────────
      .replace(/^[-*] (.+)/gm, "<li>$1</li>")
      /*
        ^ at start of string with m flag = start of any LINE
        gm flags: g = global (all occurrences), m = multiline (^ matches line starts)
      */

      // ── Numbered lists (1. text) ──────────────────────────────────────────
      .replace(/^\d+\. (.+)/gm, "<li>$1</li>")

      // ── Headings (## Heading) ─────────────────────────────────────────────
      .replace(/^### (.+)/gm, "<h4>$1</h4>")
      .replace(/^## (.+)/gm, "<h3>$1</h3>")
      .replace(/^# (.+)/gm, "<h2>$1</h2>")

      // ── Newlines → <br> (only outside of block elements) ─────────────────
      .replace(/\n(?!<\/?(li|pre|h[234]|code))/g, "<br>")
      /*
        Replace newlines with <br>, BUT NOT if they're immediately before
        a closing tag like </li>, </pre> etc. (negative lookahead: (?!...))
      */
  };

  return (
    <div className={`message-wrapper ${isUser ? "message-user" : "message-assistant"}`}>
      {/* 
        Template literal for className:
        - Always has "message-wrapper"
        - Adds "message-user" or "message-assistant" based on role
      */}
      
      {/* Avatar — different for user vs assistant */}
      <div className={`message-avatar ${isUser ? "avatar-user" : "avatar-assistant"}`}>
        {isUser ? (
          // User avatar: person icon
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        ) : (
          // Assistant avatar: AI spark icon
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2L13.09 8.26L19 6L14.74 10.91L21 12L14.74 13.09L19 18L13.09 15.74L12 22L10.91 15.74L5 18L9.26 13.09L3 12L9.26 10.91L5 6L10.91 8.26L12 2Z"/>
          </svg>
        )}
      </div>

      {/* Message bubble */}
      <div className={`message-bubble ${isUser ? "bubble-user" : "bubble-assistant"}`}>
        
        {isUser ? (
          // User messages: just plain text (no markdown)
          <p className="message-text">{content}</p>
        ) : (
          // Assistant messages: render as HTML (with parsed markdown)
          <div
            className="message-text markdown-content"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            /*
              dangerouslySetInnerHTML is React's way of setting innerHTML.
              The "dangerously" in the name is a warning: if the HTML contains
              user-generated content, it could be a XSS attack vector.
              Here it's safe because the content comes from our own AI, not from users.
            */
          />
        )}

        {/* Blinking cursor at the end of the last AI message while streaming */}
        {isStreaming && (
          <span className="typing-cursor" aria-hidden="true">▋</span>
          // aria-hidden="true" hides decorative elements from screen readers
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
