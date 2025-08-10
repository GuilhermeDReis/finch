import React, { createContext, useContext, useState } from 'react';

interface DateContextType {
  selectedYear: number;
  selectedMonth: number;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const useDateContext = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDateContext must be used within a DateProvider');
  }
  return context;
};

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  return (
    <DateContext.Provider value={{
      selectedYear,
      selectedMonth,
      setSelectedYear,
      setSelectedMonth,
    }}>
      {children}
    </DateContext.Provider>
  );
};