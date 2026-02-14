import { forwardRef } from 'react';
import type { DatePickerInputProps } from './dashboardTypes';



export const DatePickerCustomInput = forwardRef<HTMLButtonElement, DatePickerInputProps>(
    function DatePickerCustomInput({ value, onClick, placeholder, className }, ref) {
        return (
            <button
                className={className}
                onClick={onClick}
                ref={ref}
                type="button"
                style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--card2)',
                    color: value ? 'var(--text)' : 'var(--muted)',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontWeight: 400,
                    display: 'flex',
                    alignItems: 'center',
                    height: 'auto',
                    lineHeight: 'normal',
                }}
            >
                {value || placeholder}
            </button>
        );
    }
);