import './admin-catalog.css';

export const AdminCatalogPage = ({
  title,
  actions,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  pagination,
  children,
  afterContent,
}) => (
  <div className="admin-catalog-wrapper">
    <div className="admin-catalog-header">
      <h1 className="admin-catalog-title">{title}</h1>
    </div>

    <div className="admin-catalog-content">
      {actions && (
        <div className="admin-catalog-controls">
          <div className="admin-catalog-actions">{actions}</div>
        </div>
      )}

      <div className="admin-catalog-search">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="admin-catalog-search-input"
        />
      </div>

      {pagination}

      <div className="admin-catalog-table-container">{children}</div>
    </div>
    {afterContent}
  </div>
);

export const AdminCatalogIconButton = ({ label, icon, onClick }) => (
  <button type="button" className="admin-catalog-icon-button" onClick={onClick} aria-label={label} title={label}>
    {icon ? <img src={icon} alt={label} className="admin-catalog-action-img" /> : label}
  </button>
);

export const AdminCatalogActionButton = ({ children, onClick }) => (
  <button type="button" className="admin-catalog-action-button" onClick={onClick}>
    {children}
  </button>
);

export const AdminCatalogPagination = ({
  start,
  end,
  total,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
}) => (
  <div className="admin-catalog-pagination">
    <button
      type="button"
      className="admin-catalog-pagination-button"
      onClick={onPrevious}
      disabled={previousDisabled}
      aria-label="Pagina anterior"
    >
      &#8249;
    </button>
    <span className="admin-catalog-pagination-info">
      Mostrando: {start}-{end} de {total}
    </span>
    <button
      type="button"
      className="admin-catalog-pagination-button"
      onClick={onNext}
      disabled={nextDisabled}
      aria-label="Pagina siguiente"
    >
      &#8250;
    </button>
  </div>
);

export const AdminCatalogTable = ({ columns, rows, emptyMessage, emptyColSpan }) => (
  <table className="admin-catalog-table">
    <thead>
      <tr>
        {columns.map((column) => (
          <th key={column}>{column}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows?.length ? (
        rows
      ) : (
        <tr>
          <td colSpan={emptyColSpan || columns.length} className="admin-catalog-empty">
            {emptyMessage}
          </td>
        </tr>
      )}
    </tbody>
  </table>
);
