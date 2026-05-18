# AAI-HRMS Web — CRA build + nginx (same-origin /api proxy in nginx.conf)
FROM node:20-bookworm AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/root/.yarn \
    yarn config set network-timeout 600000 -g \
    && yarn install --frozen-lockfile

COPY . .

ARG REACT_APP_BACKEND_URL=
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN yarn build

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="aai-hrms-web" \
      org.opencontainers.image.description="AAI HRMS static UI (nginx)"

RUN apk add --no-cache wget

ENV API_UPSTREAM=api:8000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
