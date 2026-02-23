import re

def validate_cpf(cpf: str) -> bool:
    """Valida um CPF brasileiro"""
    # Remove caracteres não numéricos
    cpf = re.sub(r'[^0-9]', '', cpf)
    
    # Verifica se tem 11 dígitos
    if len(cpf) != 11:
        return False
    
    # Verifica se todos os dígitos são iguais
    if cpf == cpf[0] * 11:
        return False
    
    # Validação do primeiro dígito verificador
    sum = 0
    for i in range(9):
        sum += int(cpf[i]) * (10 - i)
    remainder = 11 - (sum % 11)
    digit1 = 0 if remainder > 9 else remainder
    
    if int(cpf[9]) != digit1:
        return False
    
    # Validação do segundo dígito verificador
    sum = 0
    for i in range(10):
        sum += int(cpf[i]) * (11 - i)
    remainder = 11 - (sum % 11)
    digit2 = 0 if remainder > 9 else remainder
    
    if int(cpf[10]) != digit2:
        return False
    
    return True

def format_cpf(cpf: str) -> str:
    """Formata CPF no padrão XXX.XXX.XXX-XX"""
    cpf = re.sub(r'[^0-9]', '', cpf)
    return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
