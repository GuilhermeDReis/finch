import React from 'react';
import ChartWizardModal from './ChartWizardModal';

interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddChartModal({ isOpen, onClose }: AddChartModalProps) {
  return <ChartWizardModal isOpen={isOpen} onClose={onClose} />;
}
