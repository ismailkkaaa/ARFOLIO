type ARStatusProps = {
  status: string;
  error?: string;
};

export default function ARStatus({ status, error }: ARStatusProps) {
  return (
    <div className="ar-overlay" aria-live="polite">
      <div className="scan-reticle" />
      <div className={`status-pill ${error ? 'status-error' : ''}`}>
        <span className="status-dot" />
        <span>{error || status}</span>
      </div>
    </div>
  );
}
