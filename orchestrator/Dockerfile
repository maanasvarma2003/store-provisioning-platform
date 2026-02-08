FROM node:18-alpine

WORKDIR /app

# Install Helm
RUN apk add --no-cache curl openssl \
    && curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 \
    && chmod 700 get_helm.sh \
    && ./get_helm.sh \
    && rm get_helm.sh

COPY package*.json ./
RUN npm ci

COPY . .

# Copy Helm charts
COPY ../helm /app/helm

RUN npm run build

CMD ["npm", "start"]
