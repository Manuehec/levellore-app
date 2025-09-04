/*
 * The Front-end logic for LevelLore app.
 *
 * Handles user registration/login, fetching user info,
 * daily XP operations, profile picture upload, quiz logic,
 * chat functionality and UI updates.
 */

// Utility: Make a fetch request with optional authentication
async function apiFetch(endpoint, options = {}) {
  // Support both persistent (localStorage) and session tokens based on remember-me
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers = options.headers || {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  headers['Content-Type'] = 'application/json';
  const opts = Object.assign({}, options, { headers });
  const res = await fetch(endpoint, opts);
  if (!res.ok) {
    throw res;
  }
  return res.json();
}

// DOM Elements
const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const loginMessage = document.getElementById('login-message');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');
// NEW: confirm password + eye toggles
const registerPasswordConfirm = document.getElementById('register-password-confirm');
const toggleLoginPassword = document.getElementById('toggle-login-password');
const toggleRegisterPassword = document.getElementById('toggle-register-password');
const toggleRegisterPasswordConfirm = document.getElementById('toggle-register-password-confirm');

const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');

// Leaderboard and remember-me related elements
// NOTE: Use consistent variable names and match the element IDs defined in index.html.
// The leaderboard overlay uses id="leaderboard-section" in index.html.  
const leaderboardBtn = document.getElementById('leaderboard-btn');
const leaderboardSection = document.getElementById('leaderboard-section');
const leaderboardContainer = document.getElementById('leaderboard-container');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');
const rememberMeCheckbox = document.getElementById('remember-me');

// Daily login button
const dailyLoginBtn = document.getElementById('daily-login-btn');

// Additional UI elements for improved layout
const userBar = document.querySelector('.user-bar');
const quizSectionEl = document.getElementById('quiz');
const chatSectionEl = document.getElementById('chat');
const loginOpenBtn = document.getElementById('login-open-btn');

// Imprint popup elements (styled the same as leaderboard)
const imprintBtn = document.getElementById('imprint-btn');
const imprintSection = document.getElementById('imprint-section');
const closeImprintBtn = document.getElementById('close-imprint');

const welcomeNameEl = document.getElementById('welcome-name');
const levelInfoEl = document.getElementById('level-info');
const xpInfoEl = document.getElementById('xp-info');
const profilePicEl = document.getElementById('profile-pic');
const avatarInput = document.getElementById('avatar-input');

const heroHeading = document.getElementById('hero-heading');

// Quiz elements
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const feedbackEl = document.getElementById('feedback');

// Chat elements
const chatMessagesEl = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

// Footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Quiz questions (SpongeBob trivia)
const quizQuestions = [
  {
    question: 'What is the name of the fast-food restaurant where SpongeBob works?',
    options: ['Chum Bucket', 'Krusty Krab', 'Weenie Hut Jr.', 'Shell Shack'],
    answer: 1
  },
  {
    question: 'Who is SpongeBob’s best friend?',
    options: ['Patrick Star', 'Squidward Tentacles', 'Mr. Krabs', 'Sandy Cheeks'],
    answer: 0
  },
  {
    question: 'What is the secret ingredient in the Krabby Patty?',
    options: ['Kelp', 'Plankton', 'It’s a secret!', 'Mayonnaise'],
    answer: 2
  },
  {
    question: 'What instrument does Squidward play?',
    options: ['Clarinet', 'Flute', 'Trumpet', 'Violin'],
    answer: 0
  },
  {
    question: 'What is the name of SpongeBob’s pet snail?',
    options: ['Larry', 'Gary', 'Barry', 'Harry'],
    answer: 1
  },
  {
    question: 'Who lives in the Chum Bucket?',
    options: ['Plankton', 'Mermaid Man', 'Barnacle Boy', 'Bubble Bass'],
    answer: 0
  },
  {
    question: 'What shape is SpongeBob’s driving teacher, Mrs. Puff?',
    options: ['Pufferfish', 'Shark', 'Stingray', 'Jellyfish'],
    answer: 0
  },
  {
    question: 'What does Squidward think of SpongeBob’s enthusiasm?',
    options: ['He enjoys it', 'He finds it annoying', 'He is inspired by it', 'He ignores it'],
    answer: 1
  },
  {
    question: 'Who is the owner of the Krusty Krab?',
    options: ['Mr. Krabs', 'SpongeBob', 'Squidward', 'Patrick'],
    answer: 0
  },
  {
    question: 'Where does SpongeBob live?',
    options: ['In a rock', 'In a pineapple', 'In a boat', 'In a shell'],
    answer: 1
  },
  {
    question: 'What hobby does SpongeBob enjoy in his spare time?',
    options: ['Jellyfishing', 'Weightlifting', 'Playing soccer', 'Painting'],
    answer: 0
  },
  {
    question: 'Who tries to steal the Krabby Patty secret formula?',
    options: ['Patrick Star', 'Plankton', 'Sandy Cheeks', 'King Neptune'],
    answer: 1
  },
  {
    question: 'What type of animal is Sandy Cheeks?',
    options: ['Octopus', 'Squirrel', 'Starfish', 'Crab'],
    answer: 1
  }
];

// State
let currentUser = null;
let chatPoller = null;

// Default avatar (coloured square)
const DEFAULT_AVATAR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAIAAACRXR/mAAAAT0lEQVR4nO3OMQHAIADAMJh/A3hCFAb29IIjUZA51h7v+W4H/mkVWoVWoVVoFVqFVqFVaBVahVahVWgVWoVWoVVoFVqFVqFVaBVahVahVRz/7AHJNzgsxgAAAABJRU5ErkJggg==';

// Helper: attach eye toggle to a password input
function attachPasswordToggle(toggleBtn, inputEl) {
  if (!toggleBtn || !inputEl) return;
  toggleBtn.addEventListener('click', () => {
    const isHidden = inputEl.type === 'password';
    inputEl.type = isHidden ? 'text' : 'password';
    // swap icon
    toggleBtn.textContent = isHidden ? '🙈' : '👁️';
  });
}

// Attach eye toggles (safe even if some elements are missing)
attachPasswordToggle(toggleLoginPassword, loginPassword);
attachPasswordToggle(toggleRegisterPassword, registerPassword);
attachPasswordToggle(toggleRegisterPasswordConfirm, registerPasswordConfirm);

// Show UI for unauthenticated visitors
function showGuestUI() {
  loginSection.style.display = 'none';
  mainSection.style.display = 'block';
  if (userBar) userBar.style.display = 'none';
  if (quizSectionEl) quizSectionEl.style.display = 'none';
  if (chatSectionEl) chatSectionEl.style.display = 'none';
  heroHeading.textContent = 'Hello!';
  if (loginOpenBtn) loginOpenBtn.style.display = 'inline-block';
}

// Event listeners for login/register
loginBtn.addEventListener('click', async () => {
  loginMessage.textContent = '';
  loginMessage.style.color = '#e74c3c';
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (!username || !password) {
    loginMessage.textContent = 'Please enter username and password.';
    return;
  }
  try {
    const data = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    // Persist token and optionally remember credentials
    if (rememberMeCheckbox && rememberMeCheckbox.checked) {
      localStorage.setItem('token', data.token);
      sessionStorage.removeItem('token');
      localStorage.setItem('rememberUsername', username);
      localStorage.setItem('rememberPassword', password);
    } else {
      sessionStorage.setItem('token', data.token);
      localStorage.removeItem('token');
      localStorage.removeItem('rememberUsername');
      localStorage.removeItem('rememberPassword');
    }
    await loadUser();
  } catch (err) {
    if (err.json) {
      const msg = await err.json().catch(() => ({}));
      loginMessage.textContent = msg.message || 'Login failed.';
    } else {
      loginMessage.textContent = 'Login failed.';
    }
  }
});

registerBtn.addEventListener('click', async () => {
  loginMessage.textContent = '';
  loginMessage.style.color = '#e74c3c';
  const username = registerUsername.value.trim();
  const password = registerPassword.value;
  const confirm = registerPasswordConfirm ? registerPasswordConfirm.value : '';
  if (!username || !password) {
    loginMessage.textContent = 'Please choose a username and password.';
    return;
  }
  // NEW: require confirmation match when confirm field exists
  if (registerPasswordConfirm && password !== confirm) {
    loginMessage.textContent = 'Passwords do not match.';
    return;
  }
  try {
    await apiFetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    loginMessage.style.color = 'green';
    loginMessage.textContent = 'Account created! You can now log in.';
    registerUsername.value = '';
    registerPassword.value = '';
    if (registerPasswordConfirm) registerPasswordConfirm.value = '';
  } catch (err) {
    if (err.json) {
      const msg = await err.json().catch(() => ({}));
      loginMessage.textContent = msg.message || 'Registration failed.';
    } else {
      loginMessage.textContent = 'Registration failed.';
    }
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('token');
  currentUser = null;
  if (chatPoller) clearInterval(chatPoller);
  showGuestUI();
  loginMessage.textContent = '';
  loginMessage.style.color = '#e74c3c';
  const rememberedUsername = localStorage.getItem('rememberUsername');
  const rememberedPassword = localStorage.getItem('rememberPassword');
  loginUsername.value = rememberedUsername || '';
  loginPassword.value = rememberedPassword || '';
});

// Avatar upload
avatarInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64 = reader.result;
    try {
      const data = await apiFetch('/api/avatar', {
        method: 'POST',
        body: JSON.stringify({ image: base64 })
      });
      profilePicEl.src = data.profilePic;
      if (currentUser) {
        currentUser.profilePic = data.profilePic;
      }
    } catch (err) {
      console.error('Avatar upload failed');
    }
  };
  reader.readAsDataURL(file);
});

// Send chat message
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  try {
    await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    chatInput.value = '';
    await loadChat();
  } catch (err) {
    console.error('Failed to send message');
  }
}

// Poll chat messages periodically
function startChatPolling() {
  if (chatPoller) clearInterval(chatPoller);
  chatPoller = setInterval(() => {
    loadChat().catch((err) => {
      console.error('Chat polling error', err);
    });
  }, 5000);
}

async function loadChat() {
  try {
    const messages = await apiFetch('/api/chat');
    renderChat(messages);
  } catch (err) {
    // unauthorized or other error
  }
}

function renderChat(messages) {
  const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
  chatMessagesEl.innerHTML = '';
  sorted.forEach((msg) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let avatarHtml = '';
    if (msg.profilePic) {
      avatarHtml = `<img src="${msg.profilePic}" class="chat-avatar" alt=""> `;
    }
    msgDiv.innerHTML = `${avatarHtml}<strong>${msg.username}</strong> <span class="time">${time}</span>: ${escapeHtml(msg.text)}`;
    chatMessagesEl.appendChild(msgDiv);
  });
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Quiz logic
function loadDailyQuiz() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const idx = dayOfYear % quizQuestions.length;
  const q = quizQuestions[idx];
  questionEl.textContent = q.question;
  optionsEl.innerHTML = '';
  feedbackEl.textContent = '';
  q.options.forEach((opt, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.className = 'option-button';
    btn.addEventListener('click', () => answerQuiz(q, i, btn));
    li.appendChild(btn);
    optionsEl.appendChild(li);
  });
}

async function answerQuiz(q, chosenIndex, btn) {
  optionsEl.querySelectorAll('button').forEach((b) => (b.disabled = true));
  const correct = chosenIndex === q.answer;
  feedbackEl.textContent = correct ? 'Correct!' : 'Wrong!';
  feedbackEl.style.color = correct ? '#2ecc71' : '#e74c3c';
  try {
    const res = await apiFetch('/api/xp/quiz', { method: 'POST' });
    if (res.awarded) {
      currentUser.xp = res.xp;
      currentUser.level = res.level;
      updateUserInfo();
    }
  } catch (err) {
    console.error('Quiz XP request failed');
  }
}

function updateUserInfo() {
  welcomeNameEl.textContent = currentUser.username;
  levelInfoEl.textContent = `Level ${currentUser.level}`;
  xpInfoEl.textContent = `XP ${currentUser.xp}`;
  profilePicEl.src = currentUser.profilePic || DEFAULT_AVATAR;
  heroHeading.textContent = `Hello, ${currentUser.username}!`;

  const progress = computeLevelClient(currentUser.xp);
  const percent = (progress.xpRemaining / progress.nextThreshold) * 100;
  const xpFill = document.getElementById('xp-fill');
  if (xpFill) {
    xpFill.style.width = `${percent}%`;
  }
}

function computeLevelClient(totalXP) {
  const BASE_XP = 100;
  let level = 1;
  let threshold = BASE_XP;
  let xp = totalXP;
  while (xp >= threshold) {
    xp -= threshold;
    level++;
    threshold += BASE_XP;
  }
  return { level, xpRemaining: xp, nextThreshold: threshold };
}

// Load user data, update UI and start chat & quiz
async function loadUser() {
  try {
    const data = await apiFetch('/api/user');
    currentUser = data;
    const today = new Date().toISOString().slice(0, 10);
    if (dailyLoginBtn) {
      if (currentUser.lastLoginDate !== today) {
        dailyLoginBtn.style.display = 'block';
        dailyLoginBtn.disabled = false;
      } else {
        dailyLoginBtn.style.display = 'none';
      }
    }
    loginSection.style.display = 'none';
    mainSection.style.display = 'block';
    if (userBar) userBar.style.display = 'flex';
    if (chatSectionEl) chatSectionEl.style.display = 'block';
    if (quizSectionEl) {
      if (currentUser.lastQuizDate === today) {
        quizSectionEl.style.display = 'none';
      } else {
        quizSectionEl.style.display = 'block';
        loadDailyQuiz();
      }
    }
    if (loginOpenBtn) loginOpenBtn.style.display = 'none';
    updateUserInfo();
    await loadChat();
    startChatPolling();
  } catch (err) {
    localStorage.removeItem('token');
    showGuestUI();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    loadUser();
  } else {
    showGuestUI();
    const remUser = localStorage.getItem('rememberUsername');
    const remPass = localStorage.getItem('rememberPassword');
    if (remUser && remPass) {
      loginUsername.value = remUser;
      loginPassword.value = remPass;
    }
  }

  // Event listener for opening login modal
  if (loginOpenBtn) {
    loginOpenBtn.addEventListener('click', () => {
      loginSection.style.display = 'flex';
    });
  }

  // Leaderboard button logic
  if (leaderboardBtn && leaderboardSection && leaderboardContainer) {
    leaderboardBtn.addEventListener('click', async () => {
      try {
        const data = await apiFetch('/api/leaderboard');
        leaderboardContainer.innerHTML = '';
        data.forEach((entry, index) => {
          const row = document.createElement('div');
          row.className = 'leaderboard-row';
          if (entry.profilePic) {
            const img = document.createElement('img');
            img.src = entry.profilePic;
            img.className = 'leaderboard-avatar';
            img.alt = '';
            row.appendChild(img);
          }
          const textSpan = document.createElement('span');
          textSpan.textContent = `${index + 1}. ${entry.username} – Lv.${entry.level} (${entry.xp} XP)`;
          row.appendChild(textSpan);
          leaderboardContainer.appendChild(row);
        });
        leaderboardSection.style.display = 'block';
      } catch (err) {
        console.error('Failed to load leaderboard');
      }
    });
  }
  if (closeLeaderboardBtn && leaderboardSection) {
    closeLeaderboardBtn.addEventListener('click', () => {
      leaderboardSection.style.display = 'none';
    });
  }

  // Imprint popup logic (IDs must match index.html)
  if (imprintBtn && imprintSection && closeImprintBtn) {
    imprintBtn.addEventListener('click', (e) => {
      e.preventDefault();
      imprintSection.style.display = 'block';
    });
    closeImprintBtn.addEventListener('click', () => {
      imprintSection.style.display = 'none';
    });
  }

  // Daily login button click logic
  if (dailyLoginBtn) {
    dailyLoginBtn.addEventListener('click', async () => {
      dailyLoginBtn.disabled = true;
      try {
        const res = await apiFetch('/api/xp/daily-login', { method: 'POST' });
        if (res && typeof res.xp === 'number' && typeof res.level === 'number') {
          currentUser.xp = res.xp;
          currentUser.level = res.level;
          currentUser.lastLoginDate = new Date().toISOString().slice(0, 10);
          updateUserInfo();
        }
      } catch (err) {
        console.error('Failed to claim daily login XP');
      } finally {
        dailyLoginBtn.style.display = 'none';
        dailyLoginBtn.disabled = false;
      }
    });
  }
});
