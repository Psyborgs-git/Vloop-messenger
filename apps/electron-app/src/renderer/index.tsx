import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

const theme = createTheme({
  palette: {
    primary: {
      main: '#075E54',
    },
    secondary: {
      main: '#128C7E',
    },
    background: {
      default: '#ECE5DD',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container>
        <Typography variant="h1" component="h1" gutterBottom>
          Ahoy, Matey!
        </Typography>
        <Typography variant="body1">
          Welcome to our WhatsApp clone. More treasure to come!
        </Typography>
      </Container>
    </ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
