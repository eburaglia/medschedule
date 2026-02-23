FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências com cache limpo
RUN npm cache clean --force && \
    npm install --legacy-peer-deps

# Copiar código
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
