const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const express = require('express');
const dotenv = require('dotenv');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const EMAILS_FILE = path.join(__dirname, 'emails.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default profiles for the Sign-In system
const PRESET_USERS = [
  {
    id: "user_arena",
    name: "Arena Wisdom",
    email: "arenawisdom66@gmail.com",
    role: "Executive Manager",
    avatarColor: "#ea4335",
    initials: "AW",
    githubUsername: "client3308",
    provider: "gmail",
    copilotEnabled: true
  },
  {
    id: "user_diamond",
    name: "Diamond Mutua",
    email: "diamondmutua07@gmail.com",
    role: "Full-Stack AI Architect",
    avatarColor: "#0284c7",
    initials: "DM",
    githubUsername: "client3308",
    provider: "github",
    copilotEnabled: true
  },
  {
    id: "user_alex",
    name: "Alex Mercer",
    email: "alex.mercer@enterprise-tech.io",
    role: "Lead Systems Engineer",
    avatarColor: "#4f46e5",
    initials: "AM",
    githubUsername: "",
    provider: "local",
    copilotEnabled: true
  }
];

// Current active session state (defaults to Arena Wisdom as requested)
let currentUser = PRESET_USERS[0];

// Live Gmail Configuration state
let gmailConfig = {
  email: process.env.GMAIL_USER || 'arenawisdom66@gmail.com',
  appPassword: process.env.GMAIL_APP_PASSWORD || '',
  isConnected: false,
  lastSync: null,
  error: null
};

// In-memory Copilot token cache
let copilotSessionCache = {
  token: null,
  expiresAt: 0,
  apiEndpoint: 'https://api.individual.githubcopilot.com'
};

// Initial inbox sample data
const INITIAL_EMAILS = [
  {
    id: "mail_1",
    sender: "Sarah Jenkins",
    email: "sarah.jenkins@enterprise-tech.io",
    subject: "Q4 Product Strategy Roadmap and Client Delivery Sync",
    date: "10:24 AM",
    unread: true,
    avatarColor: "#4f46e5",
    body: "Hi Team,\n\nI hope you are having a productive week. Following up on yesterday's leadership sync, we need to finalize the deliverables for the Q4 Enterprise Client release.\n\nCould you please review the attached milestones and confirm if your team can commit to the sprint delivery date of November 15th? Also, let me know if you foresee any infrastructure bottlenecks on GCP or Azure.\n\nLooking forward to your quick confirmation so we can unblock the stakeholders.\n\nBest regards,\nSarah Jenkins\nDirector of Product Solutions"
  },
  {
    id: "mail_2",
    sender: "Alex Rivera",
    email: "alex.rivera@fintech-ventures.com",
    subject: "Follow-up on Partnership Proposal and Technical Due Diligence",
    date: "Yesterday",
    unread: true,
    avatarColor: "#059669",
    body: "Hello,\n\nThanks for taking the time to present the architecture demo on Tuesday. Our engineering committee was impressed by the low-latency pipeline.\n\nWe have compiled our initial technical due diligence questionnaire. Could you let us know when you might have 30 minutes next Monday or Tuesday to walk through security compliance (SOC2) and high-availability failover specs?\n\nWarm regards,\nAlex Rivera\nPrincipal Architect, FinTech Ventures"
  },
  {
    id: "mail_3",
    sender: "Elena Rostova",
    email: "elena.r@innovate-ai.org",
    subject: "Invitation: Keynote Speaker at Global AI Innovations Summit 2026",
    date: "Oct 14",
    unread: false,
    avatarColor: "#d97706",
    body: "Dear Colleague,\n\nOn behalf of the Global AI Innovations Summit Organizing Committee, it is our pleasure to invite you as an honored speaker for our virtual panel: 'Next-Generation Autonomous Agents and Enterprise Workflow Integration'.\n\nThe event takes place December 4-6, 2026. Please let us know if your schedule allows for a 35-minute keynote presentation or participation in the executive fireside panel.\n\nKindly RSVP by Friday so we can reserve your session slot.\n\nRespectfully,\nDr. Elena Rostova\nProgram Chair, GAIS 2026"
  },
  {
    id: "mail_4",
    sender: "Marcus Vance",
    email: "support@cloudmetric-monitoring.com",
    subject: "Urgent: Cloud Cluster Usage Spike Notification (Alert #9482)",
    date: "Oct 13",
    unread: true,
    avatarColor: "#dc2626",
    body: "Alert Notice: Automated CloudMetric Watchdog\n\nYour production compute cluster 'cluster-eu-west-primary' exceeded 85% sustained CPU and memory utilization over the past 4 hours.\n\nPlease investigate background query workers or consider enabling horizontal autoscaling to avoid request throttling during peak business hours.\n\nDashboard: https://status.cloudmetric.local/incidents/9482\n\n- CloudMetric Operations Team"
  }
];

function loadEmails() {
  try {
    if (!fs.existsSync(EMAILS_FILE)) {
      fs.writeFileSync(EMAILS_FILE, JSON.stringify(INITIAL_EMAILS, null, 2), 'utf-8');
      return INITIAL_EMAILS;
    }
    const data = fs.readFileSync(EMAILS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading emails file, using default:', err);
    return INITIAL_EMAILS;
  }
}

function saveEmails(emails) {
  try {
    fs.writeFileSync(EMAILS_FILE, JSON.stringify(emails, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving emails:', err);
  }
}

loadEmails();

// Helper: Resolve GitHub Token from env or system Git Credential Helper
function resolveGitHubToken() {
  if (process.env.COPILOT_API_KEY && process.env.COPILOT_API_KEY.trim()) {
    return process.env.COPILOT_API_KEY.trim();
  }
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }
  try {
    const creds = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    for (const line of creds.split('\n')) {
      if (line.startsWith('password=')) {
        return line.replace('password=', '').trim();
      }
    }
  } catch (err) {
    // Git credential helper not available or empty
  }
  return null;
}

// Helper: Obtain GitHub Copilot session token
async function getCopilotSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  if (copilotSessionCache.token && copilotSessionCache.expiresAt > now + 60) {
    return {
      token: copilotSessionCache.token,
      apiEndpoint: copilotSessionCache.apiEndpoint
    };
  }

  const ghToken = resolveGitHubToken();
  if (!ghToken) {
    throw new Error('No GitHub or Copilot token configured. Please configure in Settings or sign in with GitHub.');
  }

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: '/copilot_internal/v2/token',
      method: 'GET',
      headers: {
        'Authorization': 'token ' + ghToken,
        'User-Agent': 'GithubCopilot/1.155.0',
        'Editor-Version': 'vscode/1.85.1',
        'Editor-Plugin-Version': 'copilot/1.155.0',
        'Accept': 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            copilotSessionCache = {
              token: parsed.token,
              expiresAt: parsed.expires_at || (now + 1800),
              apiEndpoint: (parsed.endpoints && parsed.endpoints.api) || 'https://api.individual.githubcopilot.com'
            };
            resolve(copilotSessionCache);
          } catch (e) {
            reject(new Error('Failed to parse Copilot token response'));
          }
        } else {
          reject(new Error(`Copilot token exchange failed (HTTP ${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ==================== LIVE GMAIL IMAP / SMTP SERVICES ====================

async function testGmailConnection(email, appPassword) {
  const cleanPass = appPassword.replace(/\s+/g, '').trim();
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: email.trim(),
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: false
  });

  await client.connect();
  const mailbox = await client.getMailboxLock('INBOX');
  mailbox.release();
  await client.logout();
  return true;
}

async function syncGmailInbox(limit = 20) {
  if (!gmailConfig.email || !gmailConfig.appPassword) {
    throw new Error('Gmail App Password required to sync live inbox');
  }

  const cleanPass = gmailConfig.appPassword.replace(/\s+/g, '').trim();
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: gmailConfig.email.trim(),
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: false
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  const fetchedEmails = [];

  try {
    const status = await client.status('INBOX', { messages: true });
    const totalMessages = status.messages;
    if (totalMessages > 0) {
      const fromSeq = Math.max(1, totalMessages - limit + 1);
      const range = `${fromSeq}:*`;
      for await (const message of client.fetch(range, { envelope: true, source: true, flags: true })) {
        const parsed = await simpleParser(message.source);
        const senderName = (parsed.from && parsed.from.value && parsed.from.value[0] && (parsed.from.value[0].name || parsed.from.value[0].address)) || 'Unknown Sender';
        const senderEmail = (parsed.from && parsed.from.value && parsed.from.value[0] && parsed.from.value[0].address) || 'unknown@domain.com';
        const dateStr = parsed.date ? new Date(parsed.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today';

        fetchedEmails.push({
          id: 'gmail_' + message.uid,
          sender: senderName,
          email: senderEmail,
          subject: parsed.subject || '(No Subject)',
          date: dateStr,
          unread: !message.flags.has('\\Seen'),
          avatarColor: '#ea4335',
          body: parsed.text || parsed.html || 'No message content available.',
          isLiveGmail: true,
          receivedAt: parsed.date || new Date()
        });
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }

  const existing = loadEmails();
  const nonGmail = existing.filter(e => !e.isLiveGmail);
  const combined = [...fetchedEmails.reverse(), ...nonGmail];
  saveEmails(combined);

  gmailConfig.isConnected = true;
  gmailConfig.lastSync = new Date().toISOString();
  gmailConfig.error = null;

  return { success: true, count: fetchedEmails.length, emails: combined };
}

async function sendLiveEmail(to, subject, text, fromName = 'Arena Wisdom') {
  if (!gmailConfig.email || !gmailConfig.appPassword) {
    return { sentLive: false, note: 'App password not set, simulated delivery' };
  }

  const cleanPass = gmailConfig.appPassword.replace(/\s+/g, '').trim();
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailConfig.email.trim(),
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const info = await transporter.sendMail({
    from: `"${fromName}" <${gmailConfig.email}>`,
    to,
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    text
  });

  return { sentLive: true, messageId: info.messageId };
}

// Fallback response generator if Copilot is offline or unauthenticated
function generateFallbackResponse(email, tone = 'professional', userCustomInstructions = '', user = currentUser) {
  const senderFirstName = (email.sender || 'there').split(' ')[0] || 'there';
  let greeting = 'Hi ' + senderFirstName + ',';
  if (tone === 'casual') {
    greeting = 'Hey ' + senderFirstName + ',';
  } else if (tone === 'urgent') {
    greeting = 'Hello ' + senderFirstName + ',';
  }

  let bodyRecommendation = '';
  const s = ((email.subject || '') + ' ' + (email.body || '')).toLowerCase();

  if (s.includes('roadmap') || s.includes('sprint') || s.includes('november 15')) {
    bodyRecommendation = 'Thank you for following up regarding the Q4 deliverables roadmap.\n\nOur team has reviewed the scope and milestones. We are on track to commit to the sprint delivery date of November 15th. We have also audited our cloud infrastructure and do not anticipate any bottlenecks at this stage.\n\nWe will keep you updated if anything changes during sprint planning.';
  } else if (s.includes('partnership') || s.includes('due diligence') || s.includes('meeting') || s.includes('calendar')) {
    bodyRecommendation = 'Thank you for the positive feedback regarding our architecture demo.\n\nWe would be glad to walk through the technical due diligence, SOC2 compliance, and high-availability architecture with your engineering committee. Monday at 2:00 PM or Tuesday at 10:30 AM works well on our side.\n\nPlease let me know which time slot suits your team best and I will send over a calendar invitation.';
  } else if (s.includes('summit') || s.includes('speaker') || s.includes('keynote')) {
    bodyRecommendation = 'Thank you very much for the honorable invitation to speak at the Global AI Innovations Summit 2026.\n\nI would be delighted to participate and share insights on autonomous enterprise agent architectures. Please send over the event speaker packet, logistics details, and timeline for slide submissions.\n\nLooking forward to collaborating with your committee.';
  } else if (s.includes('alert') || s.includes('spike') || s.includes('monitoring') || s.includes('cpu')) {
    bodyRecommendation = 'Acknowledged. Thank you for the automated alert notification.\n\nOur on-call engineering team is actively investigating the compute utilization spike on cluster-eu-west-primary. We are reviewing recent background worker queries and temporarily adjusting autoscaling thresholds to prevent request throttling.\n\nWe will update the incident report as soon as stabilized.';
  } else {
    bodyRecommendation = 'Thank you for reaching out regarding "' + (email.subject || 'your message') + '".\n\nI have reviewed your note and am coordinating the necessary details with the team. I will follow up with full confirmation shortly.\n\nPlease let me know if you need anything else in the interim.';
  }

  if (userCustomInstructions && userCustomInstructions.trim().length > 0) {
    bodyRecommendation += '\n\nAdditional Note: ' + userCustomInstructions.trim();
  }

  const signOffName = (user && user.name) ? user.name : 'Arena Wisdom';
  const signOffRole = (user && user.role) ? user.role : 'Executive Lead';

  return greeting + '\n\n' + bodyRecommendation + '\n\nBest regards,\n' + signOffName + '\n' + signOffRole;
}

// ==================== AUTH / PROFILE API ====================

app.get('/api/auth/current-user', (req, res) => {
  res.json({
    user: currentUser,
    presets: PRESET_USERS
  });
});

app.post('/api/auth/sign-in', (req, res) => {
  const { name, email, role, avatarColor, provider, githubUsername } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required to sign in.' });
  }

  const initials = name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  currentUser = {
    id: 'user_' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    role: (role && role.trim()) || 'Professional User',
    avatarColor: avatarColor || '#ea4335',
    initials,
    githubUsername: githubUsername || (provider === 'github' ? 'client3308' : ''),
    provider: provider || 'custom',
    copilotEnabled: true
  };

  res.json({ success: true, user: currentUser });
});

app.post('/api/auth/sign-out', (req, res) => {
  currentUser = null;
  res.json({ success: true, message: 'Signed out successfully' });
});

// ==================== LIVE GMAIL API ====================

app.get('/api/gmail/status', (req, res) => {
  res.json({
    email: gmailConfig.email,
    isConnected: gmailConfig.isConnected,
    hasPassword: Boolean(gmailConfig.appPassword && gmailConfig.appPassword.trim()),
    lastSync: gmailConfig.lastSync,
    error: gmailConfig.error
  });
});

app.post('/api/gmail/connect', async (req, res) => {
  const { email, appPassword } = req.body;
  const targetEmail = (email && email.trim()) || 'arenawisdom66@gmail.com';

  if (!appPassword || !appPassword.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Google App Password is required to connect live Gmail.'
    });
  }

  try {
    await testGmailConnection(targetEmail, appPassword);
    
    gmailConfig.email = targetEmail;
    gmailConfig.appPassword = appPassword.trim();
    gmailConfig.isConnected = true;
    gmailConfig.error = null;

    // Persist to .env
    try {
      const envPath = path.join(__dirname, '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      
      const updateEnvVar = (key, val) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${val}`);
        } else {
          envContent += `\n${key}=${val}`;
        }
      };

      updateEnvVar('GMAIL_USER', targetEmail);
      updateEnvVar('GMAIL_APP_PASSWORD', appPassword.trim());
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    } catch (e) {
      console.error('Could not save Gmail creds to .env:', e);
    }

    // Immediately trigger initial sync
    const syncResult = await syncGmailInbox(20);

    // Switch active user to Arena Wisdom if matching
    if (targetEmail.toLowerCase().includes('arenawisdom')) {
      currentUser = PRESET_USERS[0];
    }

    res.json({
      success: true,
      message: `Successfully connected to live Gmail (${targetEmail})!`,
      email: targetEmail,
      emailsSynced: syncResult.count
    });
  } catch (err) {
    gmailConfig.isConnected = false;
    gmailConfig.error = err.message;
    res.status(401).json({
      success: false,
      error: `Gmail authentication failed: ${err.message}. Please verify your Google App Password (generate at myaccount.google.com/apppasswords).`
    });
  }
});

app.post('/api/gmail/sync', async (req, res) => {
  try {
    const result = await syncGmailInbox(25);
    res.json({
      success: true,
      count: result.count,
      lastSync: gmailConfig.lastSync
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post('/api/gmail/disconnect', (req, res) => {
  gmailConfig.isConnected = false;
  gmailConfig.appPassword = '';
  gmailConfig.lastSync = null;

  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    envContent = envContent.replace(/^GMAIL_APP_PASSWORD=.*$/m, 'GMAIL_APP_PASSWORD=');
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
  } catch (e) {
    console.error('Could not clear .env:', e);
  }

  res.json({ success: true, message: 'Disconnected from live Gmail.' });
});

// ==================== COPILOT CONFIG & TEST API ====================

app.get('/api/config', async (req, res) => {
  const token = resolveGitHubToken();
  const hasToken = Boolean(token && token.trim().length > 0);
  const model = process.env.COPILOT_MODEL || 'gpt-4o';
  
  let copilotActive = false;
  let statusMessage = 'Not connected';

  if (hasToken) {
    try {
      await getCopilotSessionToken();
      copilotActive = true;
      statusMessage = 'Connected to GitHub Copilot (' + model + ')';
    } catch (e) {
      statusMessage = 'Token present but Copilot verification error: ' + e.message;
    }
  }

  res.json({
    connected: copilotActive,
    model: model,
    statusMessage: statusMessage,
    hasToken: hasToken,
    maskedToken: hasToken ? token.substring(0, 6) + '...' + token.substring(token.length - 4) : '',
    githubAccount: 'client3308'
  });
});

app.post('/api/config', (req, res) => {
  const { apiKey, model } = req.body;
  if (apiKey !== undefined) {
    process.env.COPILOT_API_KEY = apiKey.trim();
  }
  if (model) {
    process.env.COPILOT_MODEL = model.trim();
  }
  
  copilotSessionCache = { token: null, expiresAt: 0, apiEndpoint: 'https://api.individual.githubcopilot.com' };

  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    const updateEnvVar = (key, val) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    };
    updateEnvVar('COPILOT_API_KEY', process.env.COPILOT_API_KEY || '');
    updateEnvVar('COPILOT_MODEL', process.env.COPILOT_MODEL || 'gpt-4o');
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
  } catch (e) {
    console.error('Could not save .env:', e);
  }

  res.json({
    success: true,
    model: process.env.COPILOT_MODEL || 'gpt-4o',
    hasToken: Boolean(process.env.COPILOT_API_KEY || resolveGitHubToken())
  });
});

app.post('/api/copilot/test', async (req, res) => {
  const startTime = Date.now();
  try {
    const session = await getCopilotSessionToken();
    const apiHost = new URL(session.apiEndpoint).hostname;
    const model = process.env.COPILOT_MODEL || 'gpt-4o';

    const testPayload = JSON.stringify({
      messages: [
        { role: 'system', content: 'You are GitHub Copilot assistant. Reply with only: "GitHub Copilot is online and ready."' },
        { role: 'user', content: 'Ping' }
      ],
      model: model,
      temperature: 0.1,
      max_tokens: 30
    });

    const reply = await new Promise((resolve, reject) => {
      const creq = https.request({
        hostname: apiHost,
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + session.token,
          'Content-Type': 'application/json',
          'User-Agent': 'GithubCopilot/1.155.0',
          'Editor-Version': 'vscode/1.85.1',
          'Editor-Plugin-Version': 'copilot/1.155.0',
          'Openai-Organization': 'github-copilot',
          'Openai-Intent': 'conversation-panel'
        }
      }, cres => {
        let body = '';
        cres.on('data', chunk => body += chunk);
        cres.on('end', () => {
          if (cres.statusCode >= 200 && cres.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error(`Copilot Chat failed (${cres.statusCode}): ${body}`));
          }
        });
      });
      creq.on('error', reject);
      creq.write(testPayload);
      creq.end();
    });

    const latency = Date.now() - startTime;
    const message = reply.choices && reply.choices[0] && reply.choices[0].message
      ? reply.choices[0].message.content.trim()
      : 'Copilot responded successfully';

    res.json({
      success: true,
      model: reply.model || model,
      latencyMs: latency,
      message: message
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ==================== EMAILS & COPILOT RECOMMENDATION ====================

app.get('/api/emails', (req, res) => {
  res.json(loadEmails());
});

app.post('/api/emails/:id/read', (req, res) => {
  const emails = loadEmails();
  const mail = emails.find(m => m.id === req.params.id);
  if (mail) {
    mail.unread = false;
    saveEmails(emails);
    return res.json({ success: true, email: mail });
  }
  res.status(404).json({ error: 'Email not found' });
});

app.post('/api/emails', (req, res) => {
  const { sender, email, subject, body } = req.body;
  if (!sender || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const colors = ['#ea4335', '#0284c7', '#059669', '#d97706', '#2563eb', '#7c3aed'];
  const newEmail = {
    id: 'mail_' + Date.now(),
    sender,
    email: email || 'user@example.com',
    subject,
    date: 'Just now',
    unread: true,
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    body
  };
  const emails = loadEmails();
  emails.unshift(newEmail);
  saveEmails(emails);
  res.json({ success: true, email: newEmail });
});

// Generate email recommendation with GitHub Copilot
app.post('/api/recommend-response', async (req, res) => {
  const { email, tone = 'professional', instructions = '', userProfile = null } = req.body;
  if (!email || !email.body) {
    return res.status(400).json({ error: 'Email content is required.' });
  }

  const activeUser = userProfile || currentUser || {
    name: 'Arena Wisdom',
    role: 'Executive Manager',
    email: 'arenawisdom66@gmail.com'
  };

  const model = process.env.COPILOT_MODEL || 'gpt-4o';

  try {
    const session = await getCopilotSessionToken();
    const apiHost = new URL(session.apiEndpoint).hostname;

    const systemPrompt = `You are an elite executive email assistant powered by GitHub Copilot.
Craft an articulate, context-aware, and polished response draft ready for the user to review, edit, and send.

DESIRED TONE: ${tone}
SENDER USER PROFILE (Drafting on behalf of):
- Name: ${activeUser.name}
- Title / Role: ${activeUser.role || 'Executive'}
- Email: ${activeUser.email || 'arenawisdom66@gmail.com'}

GUIDELINES:
1. Address the recipient respectfully by their first name if clear.
2. Directly address their questions, dates, deliverables, or requests.
3. Keep the content crisp, actionable, and ready to send.
4. Sign off professionally with the user's name (${activeUser.name}) and title (${activeUser.role || ''}).
5. Output ONLY the response email draft (Greeting, Body paragraphs, Sign-off). Do not include markdown code block backticks (\`\`\`) or conversational meta commentary.`;

    const userPrompt = `INCOMING EMAIL:
From: ${email.sender} <${email.email}>
Subject: ${email.subject}
Date: ${email.date}
Body:
"""
${email.body}
"""

${instructions ? `ADDITIONAL USER INSTRUCTIONS: ${instructions}` : ''}

Please draft the response email now:`;

    const chatPayload = JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: model,
      temperature: 0.7,
      max_tokens: 600
    });

    const copilotResponse = await new Promise((resolve, reject) => {
      const creq = https.request({
        hostname: apiHost,
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + session.token,
          'Content-Type': 'application/json',
          'User-Agent': 'GithubCopilot/1.155.0',
          'Editor-Version': 'vscode/1.85.1',
          'Editor-Plugin-Version': 'copilot/1.155.0',
          'Openai-Organization': 'github-copilot',
          'Openai-Intent': 'conversation-panel'
        }
      }, cres => {
        let body = '';
        cres.on('data', chunk => body += chunk);
        cres.on('end', () => {
          if (cres.statusCode >= 200 && cres.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Failed to parse Copilot chat response'));
            }
          } else {
            reject(new Error(`Copilot API error (${cres.statusCode}): ${body}`));
          }
        });
      });
      creq.on('error', reject);
      creq.write(chatPayload);
      creq.end();
    });

    const rawReply = copilotResponse.choices && copilotResponse.choices[0] && copilotResponse.choices[0].message
      ? copilotResponse.choices[0].message.content.trim()
      : generateFallbackResponse(email, tone, instructions, activeUser);

    const cleanReply = rawReply.replace(/^```[a-z]*\n/i, '').replace(/\n```$/g, '').trim();

    return res.json({
      recommendation: cleanReply,
      source: 'github-copilot',
      model: copilotResponse.model || model,
      tokens: copilotResponse.usage ? copilotResponse.usage.total_tokens : null
    });
  } catch (error) {
    console.error('GitHub Copilot Call Notice:', error.message);
    const fallbackDraft = generateFallbackResponse(email, tone, instructions, activeUser);
    return res.json({
      recommendation: fallbackDraft,
      source: 'copilot-smart-fallback',
      notice: 'Copilot connection note (' + error.message + '). Smart fallback recommendation provided.'
    });
  }
});

// Send reply (Dispatches via live Gmail SMTP if connected!)
app.post('/api/send-reply', async (req, res) => {
  const { emailId, to, subject, body, senderUser } = req.body;
  const activeSender = senderUser || currentUser || { name: 'Arena Wisdom', email: 'arenawisdom66@gmail.com' };

  console.log(`[Email Sent] From: ${activeSender.name} <${activeSender.email}> | To: ${to} | Subject: Re: ${subject}`);

  let liveDelivery = null;
  if (gmailConfig.isConnected && gmailConfig.appPassword) {
    try {
      liveDelivery = await sendLiveEmail(to, subject, body, activeSender.name);
      console.log('[Live Gmail SMTP] Successfully dispatched to:', to, 'MessageId:', liveDelivery.messageId);
    } catch (e) {
      console.error('[Live Gmail SMTP Error]:', e.message);
      liveDelivery = { sentLive: false, error: e.message };
    }
  }

  const emails = loadEmails();
  const mail = emails.find(m => m.id === emailId);
  if (mail) {
    mail.unread = false;
    mail.replied = true;
    mail.lastReply = {
      from: `${activeSender.name} <${activeSender.email}>`,
      body,
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      liveGmailDispatched: Boolean(liveDelivery && liveDelivery.sentLive)
    };
    saveEmails(emails);
  }

  res.json({
    success: true,
    message: liveDelivery && liveDelivery.sentLive
      ? `Email reply sent LIVE via Gmail (arenawisdom66@gmail.com) to ${to}!`
      : `Email response recorded successfully (Local prototype draft)!`,
    liveDelivered: Boolean(liveDelivery && liveDelivery.sentLive),
    sender: activeSender.name,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('=======================================================');
  console.log(`  AI Email Assistant (Powered by GitHub Copilot)`);
  console.log(`  Target Live Email: arenawisdom66@gmail.com`);
  console.log(`  Running at: http://localhost:${PORT}`);
  console.log('=======================================================');
});
