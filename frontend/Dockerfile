# AAI-HRMS Web — CRA build + nginx (same-origin /api proxy in nginx.conf)
FROM node:20-alpine AS build
WORKDIR /app
ARG REACT_APP_BACKEND_URL=
ARG REACT_APP_SMART_HIRING_ONLY=1
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_SMART_HIRING_ONLY=$REACT_APP_SMART_HIRING_ONLY
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
ENV DISABLE_ESLINT_PLUGIN=true
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache wget
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
