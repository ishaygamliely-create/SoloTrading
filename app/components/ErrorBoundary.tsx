'use client';

import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    name?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`ErrorBoundary caught error in ${this.props.name}:`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 border border-red-500/50 bg-red-900/10 rounded-xl">
                    <h3 className="text-red-400 font-bold text-xs uppercase mb-1">
                        Error: {this.props.name || 'Component'}
                    </h3>
                    <p className="text-[10px] text-red-300 font-mono break-all">
                        {this.state.error?.message}
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
