import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Início</h2>
      </div>
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Página inicial em branco</p>
      </div>
    </div>
  );
};

export default Home;
