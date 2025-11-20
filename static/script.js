
// --- CONFIG ---
const SUPABASE_URL = 'https://uayzbueonvhyjckuxbgu.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheXpidWVvbnZoeWpja3V4Ymd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODY4NDEsImV4cCI6MjA3ODc2Mjg0MX0.KG68LNOx_W1XaqENLtEybOuuHin4_OR5jpM5atpcFDA';
const baseURL = ""; // Backend URL (empty for relative path)

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;

// --- DOM ELEMENTS ---
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view')
};

const inputs = {
    email: document.getElementById('email'),
    pass: document.getElementById('password'),
    encPlain: document.getElementById('plaintext'),
    encPass: document.getElementById('aes-password'),
    decCipher: document.getElementById('ciphertext_in'),
    decPass: document.getElementById('aes-password_in'),
    fileName: document.getElementById('filenameInput'),
    note: document.getElementById('noteInput')
};

const outputs = {
    userDisplay: document.getElementById('user-display'),
    authMsg: document.getElementById('auth-msg'),
    encResult: document.getElementById('ciphertext'),
    decResult: document.getElementById('recovered')
};

// --- AUTHENTICATION LOGIC ---

// Check session on load
async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    toggleView(session?.user);
    
    // Listen for auth changes (login/logout events)
    supabase.auth.onAuthStateChange((_event, session) => {
        toggleView(session?.user);
    });
}

function toggleView(user) {
    currentUser = user;
    if (user) {
        // Show Dashboard, Hide Login
        views.login.classList.add('hidden');
        views.dashboard.classList.remove('hidden');
        outputs.userDisplay.textContent = user.email;
    } else {
        // Show Login, Hide Dashboard
        views.dashboard.classList.add('hidden');
        views.login.classList.remove('hidden');
        views.login.classList.add('centered-view'); // Ensure it's centered
    }
}

async function handleAuth(type) {
    const email = inputs.email.value;
    const password = inputs.pass.value;
    outputs.authMsg.textContent = "Processing...";
    
    let result;
    if (type === 'login') {
        result = await supabase.auth.signInWithPassword({ email, password });
    } else {
        result = await supabase.auth.signUp({ email, password });
    }

    if (result.error) {
        outputs.authMsg.textContent = result.error.message;
    } else {
        if (type === 'signup') outputs.authMsg.textContent = "Success! Check email or login.";
        else outputs.authMsg.textContent = "";
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
}

// --- ENCRYPTION / BACKEND LOGIC ---

async function doEncrypt() {
    try {
        const plaintext = inputs.encPlain.value;
        const password = inputs.encPass.value;
        if (!password) return alert("Encryption password required");

        const res = await fetch(baseURL + "/api/encrypt", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plaintext, password })
        });
        
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        outputs.encResult.value = data.ciphertext_b64;
        // Auto-fill decrypt box for convenience
        inputs.decCipher.value = data.ciphertext_b64; 
    } catch (err) {
        alert("Encryption Error: " + err.message);
    }
}

async function saveToCloud() {
    const ciphertext_b64 = outputs.encResult.value;
    if (!ciphertext_b64) return alert("Encrypt something first!");

    try {
        const body = {
            ciphertext_b64,
            filename: inputs.fileName.value,
            note: inputs.note.value,
            owner: currentUser ? currentUser.email : 'anon'
        };

        const res = await fetch(baseURL + "/api/save", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) alert("Saved to secure cloud!");
        else alert("Failed to save.");
    } catch (err) {
        console.error(err);
        alert("Error saving data.");
    }
}

async function doDecrypt() {
    try {
        const ciphertext_b64 = inputs.decCipher.value;
        const password = inputs.decPass.value;
        if (!ciphertext_b64 || !password) return alert("Data missing");

        const res = await fetch(baseURL + "/api/decrypt", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ciphertext_b64, password })
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        outputs.decResult.value = data.plaintext;
    } catch (err) {
        alert("Decryption Failed: " + err.message);
    }
}

// --- EVENT LISTENERS ---
document.getElementById('btn-login').addEventListener('click', () => handleAuth('login'));
document.getElementById('btn-signup').addEventListener('click', () => handleAuth('signup'));
document.getElementById('btn-logout').addEventListener('click', handleLogout);

document.getElementById('btn-encrypt').addEventListener('click', doEncrypt);
document.getElementById('btn-save').addEventListener('click', saveToCloud);
document.getElementById('btn-decrypt').addEventListener('click', doDecrypt);

// Start
initAuth();
