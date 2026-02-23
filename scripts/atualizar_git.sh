#!/bin/bash

echo "==================================="
echo "📤 Atualizando GitHub"
echo "==================================="

cd /opt/medschedule

# Verificar se há alterações
if git status --porcelain | grep -q .; then
    echo "📦 Alterações detectadas:"
    git status -s
    
    echo ""
    echo "📝 Adicionando arquivos..."
    git add .
    
    echo ""
    echo "💬 Digite a mensagem do commit (ou pressione Enter para usar a padrão):"
    read -r commit_msg
    
    if [ -z "$commit_msg" ]; then
        commit_msg="fix: correções finais no frontend e infraestrutura

- Corrigido problema de dependências do frontend
- Ajustadas versões no package.json
- Frontend agora compila com sucesso
- Sistema totalmente funcional com high ports"
    fi
    
    git commit -m "$commit_msg"
    
    echo ""
    echo "🚀 Enviando para o GitHub..."
    git push origin main
    
    echo ""
    echo "✅ GitHub atualizado com sucesso!"
else
    echo "✅ Nenhuma alteração detectada. Tudo atualizado!"
fi

echo ""
echo "📋 Último commit:"
git log -1 --oneline

echo ""
echo "==================================="
echo "📌 Acesse: https://github.com/$(git config --get remote.origin.url | cut -d':' -f2 | sed 's/.git$//')"
echo "==================================="
