'use client';

import { useEffect, useState } from 'react';
import { useApiKey } from '@/hooks/use-api-key';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

function maskKey(key: string): string {
  if (key.length < 8) return key;
  return `sk-...${key.slice(-4)}`;
}

export function ApiKeyDialog({ open, onOpenChange, onSave }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useApiKey();
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setShowClearConfirm(false);
      if (apiKey) {
        setIsEditing(false);
        setInputValue('');
      } else {
        setIsEditing(true);
        setInputValue('');
      }
    }
  }, [open, apiKey]);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      setApiKey(trimmed);
      onOpenChange(false);
      onSave?.();
    }
  };

  const handleClear = () => {
    if (showClearConfirm) {
      setApiKey(null);
      onOpenChange(false);
    } else {
      setShowClearConfirm(true);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setInputValue('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider text-accent">
            Enter OpenRouter API Key
          </DialogTitle>
          <DialogDescription>
            Your key will be used to pay for your solves. Create an account with at least
            USD15 at{' '}
            <a
              href="https://openrouter.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent/80"
            >
              openrouter.ai
            </a>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {apiKey && !isEditing ? (
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm text-muted-foreground">{maskKey(apiKey)}</code>
              <button
                className="stamp-btn-nav-neutral px-3 py-1"
                onClick={handleEdit}
              >
                Edit
              </button>
            </div>
          ) : (
            <Input
              type="text"
              placeholder="sk-or-..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              autoFocus
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            className="stamp-btn-nav-neutral px-4 py-1.5"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          {apiKey && (
            <button className="stamp-btn-nav-warning px-4 py-1.5" onClick={handleClear}>
              {showClearConfirm ? 'Confirm Clear' : 'Clear'}
            </button>
          )}
          {isEditing && inputValue.trim() !== '' && (
            <button className="stamp-btn-nav-cyan px-4 py-1.5" onClick={handleSave}>
              Save
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
