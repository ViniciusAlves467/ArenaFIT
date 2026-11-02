/** Regra de senha do app (espelhada em `auth.password` do config.toml). */
export function passwordIssue(password: string): string | null {
  if (password.length < 8) return 'Use pelo menos 8 caracteres';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'Misture letras e números';
  return null;
}
