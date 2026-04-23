# AAI-HRMS Web — CRA build + nginx (same-origin /api proxy in nginx.conf)
# Build: docker compose build web   |   REACT_APP_BACKEND_URL build-arg for split deploy
FROM node:20-bookworm AS build

WORKDIR /app

# CRA / craco
COPY package.json yarn.lock ./
# Long timeout for slow / flaky registry (corporate proxies, CI)
RUN yarn config set network-timeout 600000 -g && yarn install --frozen-lockfile

COPY . .

# Empty = same-origin /api (nginx proxies to api service). Override for remote API hosts.
ARG REACT_APP_BACKEND_URL=
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN yarn build

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="aai-hrms-web" \
      org.opencontainers.image.description="AAI HRMS static UI (nginx)"

RUN apk add --no-cache wget

# Use nginx's built-in envsubst support (docker-entrypoint.d/20-envsubst-on-templates.sh)
# Default works with docker-compose.yml service name `api`; override in EasyPanel via API_UPSTREAM=backend:8000.
ENV API_UPSTREAM=api:8000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
