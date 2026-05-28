# ========================================================
# ETAPA 1: Build (Vite)
# ========================================================
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm ci

COPY . .
RUN npm run build

# ========================================================
# ETAPA 2: Runtime (Nginx)
# ========================================================
FROM nginx:1.28-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
