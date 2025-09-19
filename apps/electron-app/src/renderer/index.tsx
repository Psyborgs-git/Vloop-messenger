import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline, Typography, Button } from '@mui/material';
import { theme, Layout } from '@whatsapp-clone/ui';

// This is a global declaration for the electronAPI exposed in the preload script.
declare global {
  interface Window {
    electronAPI: {
      getUsers: () => Promise<any[]>;
    };
  }
}

function App() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const result = await window.electronAPI.getUsers();
      setUsers(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        <Typography variant="h4" gutterBottom>
          Welcome to the WhatsApp Clone
        </Typography>
        <Typography paragraph>
          This is the main content area.
        </Typography>
        <Button variant="contained" onClick={fetchUsers}>
          Fetch Users from DB
        </Button>
        {error && <Typography color="error" sx={{ mt: 2 }}>Error: {error}</Typography>}
        {users.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <Typography variant="h6">Users:</Typography>
            <ul>
              {users.map((user) => (
                <li key={user.id}>{user.name || user.email || user.id}</li>
              ))}
            </ul>
          </div>
        )}
      </Layout>
    </ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
