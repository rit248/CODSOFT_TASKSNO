const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const typing = document.getElementById('typing');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const modelText = document.getElementById('modelText');
const clearBtn = document.getElementById('clearBtn');

function addMessage(role, text) {
  const row = document.createElement('div');
  row.className = `message ${role}`;
  if (role === 'rj') {
    const icon = document.createElement('div');
    icon.className = 'msg-icon';
    icon.textContent = 'RJ';
    row.appendChild(icon);
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  chat.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

async function send(text = input.value.trim()) {
  if (!text || sendBtn.disabled) return;
  input.value = '';
  resizeInput();
  addMessage('user', text);
  sendBtn.disabled = true;
  typing.classList.remove('hidden');
  try {
    const res = await fetch(`${API_BASE}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    addMessage('rj', data.reply || 'I am ready.');
    if (data.action === 'ollama_error') refreshStatus();
  } catch (err) {
    addMessage('rj', 'I could not reach the local RJ server. Make sure app.py is running.');
  } finally {
    typing.classList.add('hidden');
    sendBtn.disabled = false;
    input.focus();
  }
}

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 140) + 'px';
}

async function refreshStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    const data = await res.json();
    const online = !!data.ollama && !!data.model_installed;
    statusDot.className = 'status-dot ' + (online ? 'online' : 'offline');
    statusText.textContent = online ? 'Ollama online' : 'Ollama offline';
    modelText.textContent = data.model || 'Local AI';
  } catch {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'RJ server offline';
    modelText.textContent = 'Start app.py';
  }
}

sendBtn.addEventListener('click', () => send());
input.addEventListener('input', resizeInput);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

document.querySelectorAll('[data-command]').forEach(btn => {
  btn.addEventListener('click', () => send(btn.dataset.command));
});
document.querySelectorAll('[data-suggestion]').forEach(btn => {
  btn.addEventListener('click', () => send(btn.dataset.suggestion));
});

clearBtn.addEventListener('click', () => {
  document.querySelectorAll('.message').forEach(el => el.remove());
  input.focus();
});

refreshStatus();
input.focus();
