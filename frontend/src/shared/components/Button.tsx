import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-colors duration-150 ease-brand motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-btn-accent hover:bg-accent-hover dark:text-surface-dark disabled:shadow-none',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-primary-soft',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
};

interface CommonProps {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}
type LinkProps = CommonProps & { href: string; type?: never; disabled?: never };
type NativeProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined };

/** Pill button; renders a Next link with identical styling when `href` is given. */
export function Button({ variant = 'primary', className = '', ...props }: LinkProps | NativeProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`.trim();

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        {props.children}
      </Link>
    );
  }

  return <button {...props} type={props.type ?? 'button'} className={classes} />;
}
