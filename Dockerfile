FROM node:22-alpine AS dev

WORKDIR /app

# Dependencias (capa cacheable)
COPY package.json ./
RUN npm install

# Código fuente
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
