import { Component } from 'react';
import { reportException } from '../lib/observability';
import './app-boundary.css';

export const LoadingSpinner = ({ texto = 'Cargando...' }) => (
	<div className="app-loading">
		<div className="app-loading-spinner" aria-label="Cargando" role="status" />
		{texto && <p className="app-loading-text">{texto}</p>}
	</div>
);

class AppBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null, info: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		this.setState({ info });
		reportException(error, { componentStack: info?.componentStack });
		console.error('[ErrorBoundary]', error, info?.componentStack);
	}

	handleReload = () => window.location.reload();

	handleBack = () => {
		window.history.back();
		setTimeout(() => {
			if (window.location.pathname !== '/dashboard') {
				window.location.href = '/dashboard';
			}
		}, 300);
	};

	render() {
		const { error, info } = this.state;
		const { children, fallback } = this.props;

		if (!error) return children;

		if (fallback) return fallback(error, this.handleReload);

		const isDev = process.env.NODE_ENV === 'development';

		return (
			<div className="app-error" role="alert">
				<div className="app-error-icon" aria-hidden>⚠</div>

				<h1 className="app-error-title">Algo salió mal</h1>

				<p className="app-error-message">
					Ocurrió un error inesperado en esta pantalla. Puedes intentar recargar
					la página o regresar al inicio.
				</p>

				{isDev && error?.message && (
					<pre className="app-error-detail">
						{error.message}
						{info?.componentStack
							? `\n\nComponente:${info.componentStack.split('\n').slice(0, 4).join('\n')}`
							: ''}
					</pre>
				)}

				<div className="app-error-actions">
					<button className="app-error-btn primary" onClick={this.handleReload}>
						Recargar página
					</button>
					<button className="app-error-btn secondary" onClick={this.handleBack}>
						Regresar
					</button>
				</div>
			</div>
		);
	}
}

export default AppBoundary;
