import { Button } from './Button';
import { AlertIcon } from './icons';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorAlert({ title, message, onRetry }: ErrorAlertProps) {
  return (
    <div role="alert" className="flex gap-3 rounded-card border border-danger/30 bg-danger-soft p-4 text-danger">
      <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <p>{message}</p>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry} className="mt-3 px-4! py-1.5!">
            Reintentar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
