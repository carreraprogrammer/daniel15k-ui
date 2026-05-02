import type { ReactNode } from 'react';
import { ErrorNotice } from '../ErrorNotice/ErrorNotice';

interface ErrorStateProps {
	message: string;
	onRetry?: () => void;
	title?: string;
	retryLabel?: string;
	secondaryAction?: ReactNode;
}

export const ErrorState = ({
	message,
	onRetry,
	title,
	retryLabel,
	secondaryAction,
}: ErrorStateProps) => (
	<ErrorNotice
		title={title}
		message={message}
		onRetry={onRetry}
		retryLabel={retryLabel}
		secondaryAction={secondaryAction}
	/>
);
