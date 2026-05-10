import { render, screen } from '@testing-library/react';
import {
  AdminCatalogIconButton,
  AdminCatalogPage,
  AdminCatalogPagination,
  AdminCatalogTable,
} from './admin-catalog.jsx';

test('renders a shared catalog page with actions, search, pagination and table', () => {
  render(
    <AdminCatalogPage
      title="Administrar Doctores"
      actions={<AdminCatalogIconButton label="Agregar Doctor" onClick={() => {}} />}
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Busca Doctores Aqui..."
      pagination={
        <AdminCatalogPagination
          start={1}
          end={3}
          total={3}
          onPrevious={() => {}}
          onNext={() => {}}
          previousDisabled
          nextDisabled
        />
      }
    >
      <AdminCatalogTable
        columns={['Nombre', 'Accion']}
        emptyMessage="No hay doctores para mostrar"
        emptyColSpan={2}
      />
    </AdminCatalogPage>
  );

  expect(screen.getByRole('heading', { name: /Administrar Doctores/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Agregar Doctor/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Busca Doctores Aqui/i)).toBeInTheDocument();
  expect(screen.getByText(/Mostrando: 1-3 de 3/i)).toBeInTheDocument();
  expect(screen.getByRole('table')).toHaveClass('admin-catalog-table');
});
