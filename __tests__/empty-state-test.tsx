import { render } from '@testing-library/react-native';

import { EmptyState } from '@/components/empty-state';

test('renders title and message', async () => {
  const { getByText } = await render(<EmptyState title="Trilha" message="Vazio" />);
  getByText('Trilha');
  getByText('Vazio');
});
