const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// IMPORTANT: Serve audio folder as static
app.use('/audio', express.static('audio'));

// File to store selections
const DATA_FILE = path.join(__dirname, 'selections.json');

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        selections: [],
        timestamp: new Date().toISOString()
    }, null, 2));
}

// Read selections
function readSelections() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { selections: [] };
    }
}

// Write selections
function writeSelections(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get all selections
app.get('/api/selections', (req, res) => {
    const data = readSelections();
    res.json(data);
});

// Record a selection
app.post('/api/select', (req, res) => {
    const { gift } = req.body;
    
    if (!gift) {
        return res.status(400).json({ error: 'Gift is required' });
    }

    const data = readSelections();
    
    // Check if a selection already exists
    if (data.selections.length > 0) {
        return res.status(400).json({ 
            error: 'A gift has already been chosen',
            selected: data.selections[0]
        });
    }

    // Record the selection
    const selection = {
        gift: gift,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    };

    data.selections.push(selection);
    data.lastUpdated = new Date().toISOString();
    writeSelections(data);

    res.json({ 
        success: true, 
        message: 'Gift selected successfully!',
        selection: selection
    });
});

// ============================================================
// KEEP-ALIVE ENDPOINT (for cron-job.org)
// ============================================================
app.get('/ping', (req, res) => {
    res.status(200).send('ok');
});

// ============================================================
// Reset selections (for testing/clearing)
// ============================================================
app.post('/api/reset', (req, res) => {
    const data = { 
        selections: [], 
        timestamp: new Date().toISOString() 
    };
    writeSelections(data);
    res.json({ 
        success: true, 
        message: 'Selections reset successfully' 
    });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle favicon (optional - removes 404 error)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

app.listen(PORT, () => {
    console.log('🎉 Server running on http://localhost:3000');
    console.log('📊 Dashboard: http://localhost:3000/dashboard');
    console.log('🏓 Ping endpoint: http://localhost:3000/ping');
});