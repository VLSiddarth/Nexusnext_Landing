import React from 'react';

const EnvChecker = () => {
  return (
    <div style={{ padding: '20px', background: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h2>Environment Variables Check</h2>
      <p>REACT_APP_SUPABASE_URL: {process.env.REACT_APP_SUPABASE_URL ? '✅ Set' : '❌ Not set'}</p>
      <p>REACT_APP_SUPABASE_ANON_KEY: {process.env.REACT_APP_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}</p>
      
      {process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY ? (
        <div style={{ marginTop: '20px', padding: '10px', background: 'green' }}>
          Environment variables are properly set! Your app should work now.
        </div>
      ) : (
        <div style={{ marginTop: '20px', padding: '10px', background: 'red' }}>
          Environment variables are missing. Please check your .env file.
        </div>
      )}
    </div>
  );
};

export default EnvChecker;