import React from 'react';
export interface GoogleSignInButtonProps {
  onSignIn: () => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSignIn,
  disabled = false,
  loading = false,
  label = 'CONTINUE WITH GOOGLE',
}) => (
  <button
    type="button"
    onClick={() => void onSignIn()}
    disabled={disabled || loading}
    className="w-full py-2.5 text-[10px] font-black border-2 border-[var(--skipo-border-color)] bg-[var(--skipo-bg)] flex items-center justify-center gap-2 disabled:opacity-50"
    aria-label={label}
  >
    {loading ? 'CONNECTING GOOGLE...' : label}
  </button>
);

export default GoogleSignInButton;
