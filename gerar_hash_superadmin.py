#!/usr/bin/env python3
"""
Rode este script para gerar o hash bcrypt da sua senha de superadmin.
Depois cole o resultado no migration_superadmin.sql.

Uso:
    python3 gerar_hash_superadmin.py
"""

from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("=" * 60)
print("  Gerador de hash — superadmin Caixify")
print("=" * 60)

senha = input("\nDigite a senha desejada: ").strip()

if len(senha) < 8:
    print("\n⚠  Use pelo menos 8 caracteres.")
else:
    hash_gerado = pwd.hash(senha)
    print(f"\nHash bcrypt:\n\n  {hash_gerado}\n")
    print("Cole esse valor no SQL abaixo e execute no banco:\n")
    print(f"""  UPDATE superadmins
  SET senha = '{hash_gerado}'
  WHERE login = 'superadmin';

  -- ou, se ainda não inseriu o superadmin:

  INSERT INTO superadmins (nome, login, senha)
  VALUES ('Administrador', 'superadmin', '{hash_gerado}')
  ON CONFLICT (login) DO UPDATE SET senha = EXCLUDED.senha;
""")