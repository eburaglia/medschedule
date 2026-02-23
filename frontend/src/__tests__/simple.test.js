describe('Testes Simples', () => {
  test('soma 1 + 1 = 2', () => {
    expect(1 + 1).toBe(2);
  });

  test('verifica se string está definida', () => {
    const texto = 'Medschedule';
    expect(texto).toBeDefined();
    expect(texto).toBe('Medschedule');
  });
});
