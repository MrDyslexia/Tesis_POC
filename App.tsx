import React from 'react';
import { WebSocketProvider } from './context/WebSocketContext';
import AppNavigator from './navigation/AppNavigator';

const App = () => {
  return (
    <WebSocketProvider>
      <AppNavigator />
    </WebSocketProvider>
  );
};

export default App;
