FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
ENV VITE_API_BASE_URL=
RUN npm run build

FROM ruby:3.4-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential libsqlite3-dev libyaml-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/Gemfile backend/Gemfile.lock ./
ENV BUNDLE_WITHOUT=development:test
RUN bundle install --jobs 4 --retry 3

COPY backend/ .

COPY --from=frontend-builder /app/frontend/dist/ ./public/

RUN mkdir -p storage log tmp

ENV RAILS_ENV=production
ENV RAILS_LOG_TO_STDOUT=true

EXPOSE 3000

CMD ["sh", "-c", "export SECRET_KEY_BASE=${SECRET_KEY_BASE:-$(bundle exec rails secret)} && bundle exec rails db:prepare && bundle exec rails server -b 0.0.0.0"]
