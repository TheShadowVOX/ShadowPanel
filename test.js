const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('OK'));

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

process.on('exit', (code) => console.log('Exit code:', code));
process.on('uncaughtException', e => console.error('Uncaught:', e));
process.on('unhandledRejection', (r) => console.error('Rejection:', r));
