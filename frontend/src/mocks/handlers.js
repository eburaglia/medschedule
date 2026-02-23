import { rest } from 'msw';

const API_URL = 'http://localhost:50800';

export const handlers = [
  // Auth
  rest.post(`${API_URL}/api/v1/auth/token`, (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: 'fake-token',
        token_type: 'bearer',
      })
    );
  }),

  // Users
  rest.get(`${API_URL}/api/v1/users/me`, (req, res, ctx) => {
    return res(
      ctx.json({
        id: '123',
        name: 'Usuário Teste',
        email: 'teste@email.com',
        user_type: 'usuario_final',
        status: 'active',
      })
    );
  }),

  rest.get(`${API_URL}/api/v1/users`, (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '1',
          name: 'João Silva',
          email: 'joao@email.com',
          cpf: '12345678901',
          user_type: 'prestador',
          status: 'active',
        },
        {
          id: '2',
          name: 'Maria Santos',
          email: 'maria@email.com',
          cpf: '98765432101',
          user_type: 'usuario_final',
          status: 'active',
        },
      ]),
      ctx.set('x-total-count', '2')
    );
  }),

  // Categories
  rest.get(`${API_URL}/api/v1/categories`, (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '1',
          name: 'Consultas',
          description: 'Consultas médicas',
          status: 'active',
          tenants: [{ id: 1, name: 'Clínica Teste' }],
        },
        {
          id: '2',
          name: 'Exames',
          description: 'Exames laboratoriais',
          status: 'active',
          tenants: [{ id: 1, name: 'Clínica Teste' }],
        },
      ])
    );
  }),

  // Products
  rest.get(`${API_URL}/api/v1/products`, (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '1',
          name: 'Consulta Pediátrica',
          description: 'Consulta com pediatra',
          price: 35000,
          professional_commission: 40,
          product_visible_to_end_user: true,
          price_visible_to_end_user: false,
          status: 'active',
          category: { id: '1', name: 'Consultas' },
          professional: { id: '1', name: 'Dr. João' },
        },
      ])
    );
  }),

  // Schedules
  rest.get(`${API_URL}/api/v1/schedules`, (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '1',
          start_date: '2024-03-01T09:00:00',
          end_date: '2024-03-01T10:00:00',
          status: 'active',
          provider: { id: '1', name: 'Dr. João' },
          user: { id: '2', name: 'Maria Santos' },
          product: { id: '1', name: 'Consulta Pediátrica' },
        },
      ])
    );
  }),

  // Reports
  rest.get(`${API_URL}/api/v1/reports/dashboard`, (req, res, ctx) => {
    return res(
      ctx.json({
        revenueByDay: [
          { date: '2024-03-01', revenue: 35000, count: 1 },
          { date: '2024-03-02', revenue: 70000, count: 2 },
        ],
        byCategory: [
          { name: 'Consultas', value: 10, revenue: 350000 },
          { name: 'Exames', value: 5, revenue: 40000 },
        ],
        byProvider: [
          { id: '1', name: 'Dr. João', appointments: 15, revenue: 525000, commission: 210000 },
        ],
        summary: {
          totalRevenue: 525000,
          totalAppointments: 15,
          averageTicket: 35000,
          cancellationRate: 5,
        },
      })
    );
  }),

  // Tenants
  rest.get(`${API_URL}/api/v1/tenants`, (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, name: 'Clínica Teste', subdomain: 'teste', is_active: true },
      ])
    );
  }),
];
