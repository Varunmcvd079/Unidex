const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database
const db = new sqlite3.Database('./unidex.db', (err) => {
    if (err) console.error(err.message);
    else {
        console.log('Connected to SQLite.');
        
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )`);

        // UPGRADE: Notes now have a 'title' and 'content'
        db.run(`CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            subject_id INTEGER NOT NULL,
            FOREIGN KEY (subject_id) REFERENCES subjects (id)
        )`);
    }
});

// --- SUBJECT API ROUTES ---
app.get('/api/subjects', (req, res) => {
    db.all('SELECT * FROM subjects ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/subjects', (req, res) => {
    const { name } = req.body;
    db.run('INSERT INTO subjects (name) VALUES (?)', [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

app.delete('/api/subjects/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM subjects WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run('DELETE FROM notes WHERE subject_id = ?', [id]);
        res.json({ message: 'Subject deleted' });
    });
});

// --- NOTES API ROUTES ---
app.get('/api/notes/:subjectId', (req, res) => {
    db.all('SELECT * FROM notes WHERE subject_id = ? ORDER BY id DESC', [req.params.subjectId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create a new note (starts with just a title and empty content)
app.post('/api/notes', (req, res) => {
    const { title, subject_id } = req.body;
    db.run('INSERT INTO notes (title, content, subject_id) VALUES (?, ?, ?)', [title, '', subject_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title, subject_id });
    });
});

// UPGRADE: Update an existing note's content (Saving the text file)
app.put('/api/notes/:id', (req, res) => {
    const { content } = req.body;
    db.run('UPDATE notes SET content = ? WHERE id = ?', [content, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Note updated successfully' });
    });
});

app.delete('/api/notes/:id', (req, res) => {
    db.run('DELETE FROM notes WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Note deleted' });
    });
});

app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));