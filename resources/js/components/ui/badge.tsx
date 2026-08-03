import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
    {
        variants: {
            variant: {
                default:
                    'border-emerald-800/50 bg-emerald-950/50 text-emerald-400',
                secondary:
                    'border-zinc-700 bg-zinc-800 text-zinc-300',
                outline:
                    'border-zinc-700 text-zinc-400',
                destructive:
                    'border-red-800/50 bg-red-950/50 text-red-400',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
