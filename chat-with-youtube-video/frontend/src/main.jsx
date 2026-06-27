/*
  main.jsx — React Application Entry Point
  ─────────────────────────────────────────
  This is the very first file that runs when the React app starts.
  It mounts our <App /> component into the HTML page.
  
  index.html has a <div id="root"></div>.
  ReactDOM.createRoot() finds that div and "mounts" React into it.
  After this runs, React controls everything inside that div.
*/

import { StrictMode } from "react";
// StrictMode: a developer helper that:
//   1. Renders components twice (in dev) to detect side effects
//   2. Warns about deprecated APIs
//   3. Helps find bugs early — has no effect in production builds

import { createRoot } from "react-dom/client";
// createRoot: React 18's way to initialize the React app
// (older React used ReactDOM.render, which is now deprecated)

import "./App.css";     // Global styles — imported here so they apply everywhere
import App from "./App"; // Our root component

// Find the <div id="root"> in index.html and mount React into it
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    {/* Everything in our app lives inside <App /> */}
  </StrictMode>
);