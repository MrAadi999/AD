/**
 * BiharStack AI - Embeddable Website Chatbot Widget
 * Production-ready, zero-dependency, Shadow DOM isolated
 * Version: 1.0.0
 */
(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.__BIHARSTACK_WIDGET_INITIALIZED__) return;
  window.__BIHARSTACK_WIDGET_INITIALIZED__ = true;

  // 1. Detect current script and parameters
  var currentScript =
    document.currentScript ||
    document.querySelector('script[data-bot-id]') ||
    document.querySelector('script[src*="widget.js"]');

  var botId = currentScript ? currentScript.getAttribute('data-bot-id') : null;

  // Determine base API URL from script source or current origin
  var apiBase = '';
  if (currentScript && currentScript.src) {
    try {
      var scriptUrl = new URL(currentScript.src);
      apiBase = scriptUrl.origin;
    } catch (e) {
      apiBase = window.location.origin;
    }
  } else {
    apiBase = window.location.origin;
  }

  // Allow override via data attribute if needed
  if (currentScript && currentScript.getAttribute('data-api-base')) {
    apiBase = currentScript.getAttribute('data-api-base');
  }

  if (!botId) {
    console.warn('[BiharStack AI] Missing required data-bot-id attribute on script tag.');
    return;
  }

  // Helper: Escape HTML to prevent XSS
  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Helper: Format message markdown safely (handles lists, bold, links)
  function formatMessageText(text) {
    if (!text) return '';
    var safe = escapeHtml(text);
    // Bold: **text**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet points: lines starting with - or * or numbers
    safe = safe.replace(/^[•*-]\s+(.+)$/gm, '<li class="bs-li">$1</li>');
    safe = safe.replace(/^\d+\.\s+(.+)$/gm, '<li class="bs-li-num">$1</li>');
    // Wrap consecutive li items
    safe = safe.replace(/((?:<li class="bs-li">.*?<\/li>\s*)+)/g, '<ul class="bs-ul">$1</ul>');
    safe = safe.replace(/((?:<li class="bs-li-num">.*?<\/li>\s*)+)/g, '<ol class="bs-ol">$1</ol>');
    // Line breaks
    safe = safe.replace(/\n/g, '<br/>');
    return safe;
  }

  // Helper: Session management
  var SESSION_KEY = 'bs_sess_' + botId;
  function getSessionId() {
    try {
      var stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) return stored;
      var newId = 'bs_session_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, newId);
      return newId;
    } catch (e) {
      return 'bs_session_anon_' + Date.now().toString(36);
    }
  }

  // 2. Fetch Chatbot Public Configuration
  fetch(apiBase + '/api/public/chatbots/' + encodeURIComponent(botId) + '/config')
    .then(function (res) {
      if (!res.ok) {
        throw new Error('Chatbot configuration not accessible (HTTP ' + res.status + ')');
      }
      return res.json();
    })
    .then(function (config) {
      if (config.widget_enabled === false) {
        console.info('[BiharStack AI] Widget is disabled for this bot.');
        return;
      }
      initWidget(config);
    })
    .catch(function (err) {
      console.warn('[BiharStack AI] Initialization error:', err.message);
    });

  // 3. Initialize Shadow DOM and DOM Elements
  function initWidget(config) {
    var brandColor = config.brand_color || '#2563EB';
    var botName = config.assistant_name || 'AI Assistant';
    var position = config.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
    var welcomeMsg = config.welcome_message || 'Hi! How can I help you today?';
    var avatarLetter = (botName.charAt(0) || 'B').toUpperCase();
    var isLeft = position === 'bottom-left';

    // Create Host Container
    var host = document.createElement('div');
    host.id = 'biharstack-widget-container';
    document.body.appendChild(host);

    // Create Shadow Root for 100% CSS Isolation
    var shadow = host.attachShadow({ mode: 'open' });

    // Stylesheet inside Shadow DOM
    var style = document.createElement('style');
    style.textContent = [
      ':host { all: initial; z-index: 2147483647; position: fixed; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }',
      '* { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }',

      '/* Floating Trigger Button */',
      '.bs-trigger {',
      '  position: fixed;',
      '  bottom: 24px;',
      '  ' + (isLeft ? 'left: 24px;' : 'right: 24px;'),
      '  width: 60px;',
      '  height: 60px;',
      '  border-radius: 30px;',
      '  background-color: ' + brandColor + ';',
      '  color: #ffffff;',
      '  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);',
      '  border: none;',
      '  cursor: pointer;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;',
      '  z-index: 2147483647;',
      '  outline: none;',
      '}',
      '.bs-trigger:hover {',
      '  transform: scale(1.06);',
      '  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);',
      '}',
      '.bs-trigger:active {',
      '  transform: scale(0.96);',
      '}',
      '.bs-trigger-icon { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.2s ease; }',
      '.bs-trigger.is-open .bs-icon-chat { display: none; }',
      '.bs-trigger.is-open .bs-icon-close { display: block; }',
      '.bs-trigger:not(.is-open) .bs-icon-chat { display: block; }',
      '.bs-trigger:not(.is-open) .bs-icon-close { display: none; }',

      '/* Chat Window Window Container */',
      '.bs-window {',
      '  position: fixed;',
      '  bottom: 96px;',
      '  ' + (isLeft ? 'left: 24px;' : 'right: 24px;'),
      '  width: 380px;',
      '  max-width: calc(100vw - 32px);',
      '  height: 600px;',
      '  max-height: calc(100vh - 120px);',
      '  background: #ffffff;',
      '  border-radius: 20px;',
      '  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.16), 0 2px 12px rgba(0, 0, 0, 0.06);',
      '  border: 1px solid rgba(0, 0, 0, 0.08);',
      '  display: flex;',
      '  flex-direction: column;',
      '  overflow: hidden;',
      '  z-index: 2147483646;',
      '  opacity: 0;',
      '  transform: translateY(16px) scale(0.96);',
      '  pointer-events: none;',
      '  transition: opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1), transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);',
      '}',
      '.bs-window.is-open {',
      '  opacity: 1;',
      '  transform: translateY(0) scale(1);',
      '  pointer-events: auto;',
      '}',

      '/* Header */',
      '.bs-header {',
      '  padding: 16px 18px;',
      '  background: #ffffff;',
      '  border-bottom: 1px solid #f0f2f5;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  flex-shrink: 0;',
      '}',
      '.bs-header-info { display: flex; align-items: center; gap: 12px; min-width: 0; }',
      '.bs-avatar {',
      '  width: 36px;',
      '  height: 36px;',
      '  border-radius: 12px;',
      '  background-color: ' + brandColor + ';',
      '  color: #ffffff;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  font-weight: 700;',
      '  font-size: 15px;',
      '  flex-shrink: 0;',
      '}',
      '.bs-bot-details { display: flex; flex-direction: column; min-width: 0; }',
      '.bs-bot-name { font-size: 14px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.bs-status { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #059669; font-weight: 500; margin-top: 1px; }',
      '.bs-status-dot { width: 6px; height: 6px; border-radius: 50%; background-color: #10b981; }',
      '.bs-header-actions { display: flex; align-items: center; gap: 6px; }',
      '.bs-btn-icon { width: 28px; height: 28px; border-radius: 8px; border: none; background: transparent; color: #6b7280; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s; }',
      '.bs-btn-icon:hover { background: #f3f4f6; color: #111827; }',

      '/* Messages Body */',
      '.bs-body {',
      '  flex: 1;',
      '  overflow-y: auto;',
      '  padding: 18px;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 14px;',
      '  background-color: #fafbfc;',
      '  scroll-behavior: smooth;',
      '}',
      '.bs-msg { display: flex; flex-direction: column; max-width: 84%; animation: bsFadeIn 0.2s ease-out; }',
      '@keyframes bsFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }',
      '.bs-msg.user { align-self: flex-end; align-items: flex-end; }',
      '.bs-msg.bot { align-self: flex-start; align-items: flex-start; }',
      '.bs-bubble {',
      '  padding: 11px 15px;',
      '  font-size: 13px;',
      '  line-height: 1.5;',
      '  word-break: break-word;',
      '}',
      '.bs-msg.user .bs-bubble {',
      '  background-color: ' + brandColor + ';',
      '  color: #ffffff;',
      '  border-radius: 18px 18px 4px 18px;',
      '}',
      '.bs-msg.bot .bs-bubble {',
      '  background-color: #ffffff;',
      '  color: #1f2937;',
      '  border-radius: 18px 18px 18px 4px;',
      '  border: 1px solid #e5e7eb;',
      '  box-shadow: 0 1px 2px rgba(0,0,0,0.04);',
      '}',

      '/* Lists inside bubble */',
      '.bs-ul, .bs-ol { margin: 6px 0 6px 18px; padding: 0; }',
      '.bs-li, .bs-li-num { margin-bottom: 4px; }',

      '/* Sources Section in Bubble */',
      '.bs-sources { margin-top: 8px; padding-top: 8px; border-top: 1px solid #eef0f3; width: 100%; }',
      '.bs-sources-title { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }',
      '.bs-source-links { display: flex; flex-wrap: wrap; gap: 4px; }',
      '.bs-source-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: #f3f4f6; color: #4b5563; font-size: 11px; font-weight: 500; border-radius: 6px; text-decoration: none; border: 1px solid #e5e7eb; transition: all 0.15s; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.bs-source-chip:hover { background: #e5e7eb; color: #111827; border-color: #d1d5db; }',
      '/* Feedback and Instant Learning Controls */',
      '.bs-feedback-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; padding: 2px 4px; font-size: 11px; }',
      '.bs-feedback-btn { border: none; background: transparent; cursor: pointer; padding: 3px 6px; border-radius: 6px; font-size: 12px; color: #9ca3af; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px; }',
      '.bs-feedback-btn:hover { background: #f3f4f6; color: #374151; }',
      '.bs-feedback-btn.active-up { color: #10b981; font-weight: 600; }',
      '.bs-feedback-btn.active-down { color: #ef4444; font-weight: 600; }',
      '.bs-learn-badge { font-size: 11px; color: #059669; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; }',
      '.bs-correction-box { margin-top: 6px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }',
      '.bs-correction-input { border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none; font-family: inherit; }',
      '.bs-correction-input:focus { border-color: ' + brandColor + '; }',
      '.bs-correction-submit { align-self: flex-end; background: ' + brandColor + '; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; }',
      '',
      '/* Thinking / Typing Animation */',
      '.bs-thinking { display: flex; align-items: center; gap: 4px; padding: 12px 16px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px 18px 18px 4px; width: fit-content; }',
      '.bs-dot { width: 6px; height: 6px; border-radius: 50%; background-color: #9ca3af; animation: bsBounce 1.4s infinite ease-in-out both; }',
      '.bs-dot:nth-child(1) { animation-delay: -0.32s; }',
      '.bs-dot:nth-child(2) { animation-delay: -0.16s; }',
      '@keyframes bsBounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }',

      '/* Input Footer */',
      '.bs-footer {',
      '  padding: 12px 14px;',
      '  background: #ffffff;',
      '  border-top: 1px solid #f0f2f5;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 8px;',
      '  flex-shrink: 0;',
      '}',
      '.bs-input-row { display: flex; align-items: center; gap: 8px; position: relative; }',
      '.bs-input {',
      '  flex: 1;',
      '  border: 1px solid #e5e7eb;',
      '  background: #f9fafb;',
      '  border-radius: 12px;',
      '  padding: 10px 14px;',
      '  font-size: 13px;',
      '  color: #111827;',
      '  outline: none;',
      '  transition: all 0.15s ease;',
      '  font-family: inherit;',
      '}',
      '.bs-input:focus { background: #ffffff; border-color: ' + brandColor + '; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12); }',
      '.bs-send-btn {',
      '  width: 36px;',
      '  height: 36px;',
      '  border-radius: 10px;',
      '  border: none;',
      '  background-color: ' + brandColor + ';',
      '  color: #ffffff;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  cursor: pointer;',
      '  transition: opacity 0.15s;',
      '  flex-shrink: 0;',
      '}',
      '.bs-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }',
      '.bs-branding { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 10px; color: #9ca3af; }',
      '.bs-branding a { color: #6b7280; text-decoration: none; font-weight: 600; }',
      '.bs-branding a:hover { text-decoration: underline; }',

      '/* Mobile Responsive Fullscreen */',
      '@media (max-width: 640px) {',
      '  .bs-window {',
      '    position: fixed !important;',
      '    top: 0 !important;',
      '    left: 0 !important;',
      '    right: 0 !important;',
      '    bottom: 0 !important;',
      '    width: 100vw !important;',
      '    height: 100% !important;',
      '    max-width: 100vw !important;',
      '    max-height: 100% !important;',
      '    border-radius: 0 !important;',
      '    border: none !important;',
      '  }',
      '  .bs-trigger { bottom: 18px; ' + (isLeft ? 'left: 18px;' : 'right: 18px;') + ' }',
      '}'
    ].join('\n');
    shadow.appendChild(style);

    // Floating Button Element
    var triggerBtn = document.createElement('button');
    triggerBtn.className = 'bs-trigger';
    triggerBtn.setAttribute('aria-label', 'Open ' + botName);
    triggerBtn.innerHTML = [
      '<svg class="bs-trigger-icon bs-icon-chat" viewBox="0 0 24 24">',
      '  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
      '</svg>',
      '<svg class="bs-trigger-icon bs-icon-close" viewBox="0 0 24 24">',
      '  <line x1="18" y1="6" x2="6" y2="18"></line>',
      '  <line x1="6" y1="6" x2="18" y2="18"></line>',
      '</svg>'
    ].join('');
    shadow.appendChild(triggerBtn);

    // Chat Window Element
    var win = document.createElement('div');
    win.className = 'bs-window';
    win.innerHTML = [
      '<div class="bs-header">',
      '  <div class="bs-header-info">',
      '    <div class="bs-avatar">' + escapeHtml(avatarLetter) + '</div>',
      '    <div class="bs-bot-details">',
      '      <span class="bs-bot-name">' + escapeHtml(botName) + '</span>',
      '      <span class="bs-status"><span class="bs-status-dot"></span>Online</span>',
      '    </div>',
      '  </div>',
      '  <div class="bs-header-actions">',
      '    <button class="bs-btn-icon bs-close-btn" aria-label="Close Chat">',
      '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      '    </button>',
      '  </div>',
      '</div>',
      '<div class="bs-body" id="bs-messages">',
      '  <!-- Welcome Message -->',
      '  <div class="bs-msg bot">',
      '    <div class="bs-bubble">' + formatMessageText(welcomeMsg) + '</div>',
      '  </div>',
      '</div>',
      '<div class="bs-footer">',
      '  <div class="bs-input-row">',
      '    <input type="text" class="bs-input" placeholder="Ask anything..." aria-label="Ask a question" />',
      '    <button class="bs-send-btn" aria-label="Send Message" disabled>',
      '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
      '    </button>',
      '  </div>',
      '  <div class="bs-branding">',
      '    <span>Powered by <a href="https://biharstack.com" target="_blank" rel="noopener noreferrer">BiharStack AI</a></span>',
      '  </div>',
      '</div>'
    ].join('');
    shadow.appendChild(win);

    // Element references
    var messagesContainer = win.querySelector('#bs-messages');
    var inputElem = win.querySelector('.bs-input');
    var sendBtn = win.querySelector('.bs-send-btn');
    var closeBtn = win.querySelector('.bs-close-btn');

    var isOpen = false;
    var isSending = false;
    var sessionId = getSessionId();

    function toggleChat(open) {
      isOpen = typeof open === 'boolean' ? open : !isOpen;
      if (isOpen) {
        win.classList.add('is-open');
        triggerBtn.classList.add('is-open');
        inputElem.focus();
        scrollToBottom();
      } else {
        win.classList.remove('is-open');
        triggerBtn.classList.remove('is-open');
      }
    }

    triggerBtn.addEventListener('click', function () {
      toggleChat();
    });

    closeBtn.addEventListener('click', function () {
      toggleChat(false);
    });

    // Escape key closes window
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        toggleChat(false);
      }
    });

    function scrollToBottom() {
      setTimeout(function () {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
    }

    // Input state
    inputElem.addEventListener('input', function () {
      var hasText = inputElem.value.trim().length > 0;
      sendBtn.disabled = !hasText || isSending;
    });

    inputElem.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', function () {
      sendMessage();
    });

    // Append user or assistant bubble
    function appendMessage(role, text, sources, conversationId, messageId) {
      var msgDiv = document.createElement('div');
      msgDiv.className = 'bs-msg ' + role;

      var bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'bs-bubble';
      bubbleDiv.innerHTML = formatMessageText(text);

      // Render sources if available
      if (role === 'bot' && Array.isArray(sources) && sources.length > 0) {
        var sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'bs-sources';
        var srcTitle = document.createElement('div');
        srcTitle.className = 'bs-sources-title';
        srcTitle.textContent = 'Sources';
        sourcesDiv.appendChild(srcTitle);

        var linksDiv = document.createElement('div');
        linksDiv.className = 'bs-source-links';

        sources.forEach(function (src) {
          if (!src.url || !src.title) return;
          var link = document.createElement('a');
          link.className = 'bs-source-chip';
          link.href = src.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.innerHTML = escapeHtml(src.title) + ' &rarr;';
          linksDiv.appendChild(link);
        });

        if (linksDiv.children.length > 0) {
          sourcesDiv.appendChild(linksDiv);
          bubbleDiv.appendChild(sourcesDiv);
        }
      }

      msgDiv.appendChild(bubbleDiv);

      // Render Auto-Learning & Feedback Controls for bot responses
      if (role === 'bot' && messageId) {
        var feedbackRow = document.createElement('div');
        feedbackRow.className = 'bs-feedback-row';

        var upBtn = document.createElement('button');
        upBtn.className = 'bs-feedback-btn';
        upBtn.innerHTML = '👍 Helpful';

        var downBtn = document.createElement('button');
        downBtn.className = 'bs-feedback-btn';
        downBtn.innerHTML = '👎 Correct';

        feedbackRow.appendChild(upBtn);
        feedbackRow.appendChild(downBtn);
        msgDiv.appendChild(feedbackRow);

        upBtn.addEventListener('click', function () {
          upBtn.className = 'bs-feedback-btn active-up';
          upBtn.disabled = true;
          downBtn.disabled = true;
          fetch(apiBase + '/api/chat/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatbotId: botId,
              conversationId: conversationId,
              messageId: messageId,
              rating: 1,
            }),
          });
        });

        downBtn.addEventListener('click', function () {
          downBtn.className = 'bs-feedback-btn active-down';
          if (msgDiv.querySelector('.bs-correction-box')) return;

          var box = document.createElement('div');
          box.className = 'bs-correction-box';
          box.innerHTML = [
            '<input type="text" class="bs-correction-input" placeholder="What is the correct answer? (AI will auto-learn)">',
            '<button class="bs-correction-submit">Teach Bot</button>',
          ].join('');

          msgDiv.appendChild(box);
          scrollToBottom();

          var submitBtn = box.querySelector('.bs-correction-submit');
          var input = box.querySelector('.bs-correction-input');
          input.focus();

          submitBtn.addEventListener('click', function () {
            var corrected = input.value.trim();
            if (!corrected) return;
            submitBtn.textContent = 'Learning...';
            submitBtn.disabled = true;

            fetch(apiBase + '/api/chat/feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chatbotId: botId,
                conversationId: conversationId,
                messageId: messageId,
                rating: -1,
                feedbackType: 'correction',
                correctedAnswer: corrected,
              }),
            })
              .then(function () {
                box.innerHTML = '<span class="bs-learn-badge">✨ Learned! Bot updated in real-time.</span>';
              })
              .catch(function () {
                box.innerHTML = '<span class="bs-learn-badge" style="color:#ef4444;">Feedback recorded.</span>';
              });
          });
        });
      }

      messagesContainer.appendChild(msgDiv);
      scrollToBottom();
    }

    // Send Message Handler
    function sendMessage() {
      var query = inputElem.value.trim();
      if (!query || isSending) return;

      inputElem.value = '';
      sendBtn.disabled = true;
      isSending = true;

      // 1. Render User Message
      appendMessage('user', query);

      // 2. Render Thinking Dots
      var thinkingDiv = document.createElement('div');
      thinkingDiv.className = 'bs-msg bot';
      thinkingDiv.id = 'bs-thinking-indicator';
      thinkingDiv.innerHTML = '<div class="bs-thinking"><span class="bs-dot"></span><span class="bs-dot"></span><span class="bs-dot"></span></div>';
      messagesContainer.appendChild(thinkingDiv);
      scrollToBottom();

      // 3. API Call to Public Chat
      fetch(apiBase + '/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          message: query,
          session_id: sessionId,
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (resObj) {
          var indicator = messagesContainer.querySelector('#bs-thinking-indicator');
          if (indicator) indicator.remove();

          if (!resObj.ok) {
            var errorMsg = resObj.data && resObj.data.message
              ? resObj.data.message
              : 'Sorry, this assistant is temporarily unavailable.';
            appendMessage('bot', errorMsg);
            return;
          }

          var botReply = resObj.data.message || 'I have no response for that query.';
          var sources = resObj.data.sources || [];
          var convId = resObj.data.conversation_id;
          var msgId = resObj.data.message_id;
          appendMessage('bot', botReply, sources, convId, msgId);
        })
        .catch(function (err) {
          var indicator = messagesContainer.querySelector('#bs-thinking-indicator');
          if (indicator) indicator.remove();
          appendMessage('bot', 'Network error. Please check your internet connection and try again.');
        })
        .finally(function () {
          isSending = false;
          inputElem.focus();
        });
    }
  }
})();
