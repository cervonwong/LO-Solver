'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return <Sonner position="bottom-left" {...props} />;
};

export { Toaster };
