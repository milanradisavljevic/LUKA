import { Check } from 'lucide-react';
import type { StepId } from '../lib/types';
import { STEPS } from '../lib/types';

interface Props {
  currentStep: StepId;
  onStepClick: (step: StepId) => void;
}

export function WizardStepper({ currentStep, onStepClick }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav className="wizard-stepper" aria-label={`Fortschritt: Schritt ${currentIndex + 1} von ${STEPS.length}`} style={{
      display: 'flex',
      gap: '0.25rem',
      marginBottom: '1.5rem',
      padding: '0 0.25rem',
    }}>
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <button
            type="button"
            key={step.id}
            onClick={() => onStepClick(step.id)}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`Schritt ${i + 1}: ${step.label}${isActive ? ' (aktuell)' : isDone ? ' (erledigt)' : ''}`}
            style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 0.75rem',
            borderRadius: 'var(--radius)',
            background: isActive ? 'var(--color-accent)' : isDone ? 'var(--color-bg-selected)' : 'transparent',
            color: isActive ? 'white' : isDone ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: isActive || isDone ? 600 : 400,
            fontSize: '0.8125rem',
            border: isActive ? 'none' : `1px solid ${isDone ? 'var(--color-accent)' : 'var(--color-border)'}`,
            cursor: 'pointer',
            textAlign: 'left',
          }}>
            <span aria-hidden="true" style={{
              width: 20, height: 20, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6875rem', fontWeight: 700,
              background: isActive ? 'rgba(255,255,255,0.25)' : isDone ? 'var(--color-accent)' : 'var(--color-border)',
              color: isActive || isDone ? 'white' : 'var(--color-text-primary)',
            }}>
              {isDone ? <Check size={12} /> : i + 1}
            </span>
            <span aria-hidden="true">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
