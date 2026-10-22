import React from "react";

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback: React.ReactNode;
	onError?: (error: unknown) => void;
}

interface ErrorBoundaryState {
	hasError: boolean;
}

/**
 * Keeps an error in one part of the app from unmounting all of it. React only
 * offers this as a class component.
 */
export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { hasError: false };

	static getDerivedStateFromError(): ErrorBoundaryState {
		return { hasError: true };
	}

	componentDidCatch(error: unknown) {
		console.error(error);
		this.props.onError?.(error);
	}

	render() {
		return this.state.hasError ? this.props.fallback : this.props.children;
	}
}
