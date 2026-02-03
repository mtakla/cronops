# -------------------------------
# BUILD STAGE
# -------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run test

# -------------------------------
# PRODUCTION STAGE
# -------------------------------
FROM node:24-alpine AS production

# useful alpine ops addons
RUN apk add --no-cache \
  tzdata \
  bash \
  curl \
  git \
  zip \
  unzip \
  rsync \
  openssh-client \
  jq \
  yq \
  miller \
  age \
  lua

# more useful ops tools to be added here (rebuild of docker image required), e.g.
# - rclone \
# - python3 \

# environment variables
ENV CROPS_CONFIG_DIR=/config \
    CROPS_TEMP_DIR=/data/temp \
    CROPS_LOG_DIR=/data/logs \
    CROPS_SOURCE_ROOT=/io/source \
    CROPS_TARGET_ROOT=/io/target \
    CROPS_SOURCE_2_ROOT=/io/source2 \
    CROPS_TARGET_2_ROOT=/io/target2 \
    CROPS_SOURCE_3_ROOT=/io/source3 \
    CROPS_TARGET_3_ROOT=/io/target3 \
    CROPS_PORT=8083\
    NODE_ENV=production

# create folders
RUN mkdir -p \
  ${CROPS_CONFIG_DIR} \
  ${CROPS_TEMP_DIR} \
  ${CROPS_LOG_DIR} \
  ${CROPS_SOURCE_ROOT} \
  ${CROPS_TARGET_ROOT} \
  ${CROPS_SOURCE_2_ROOT} \
  ${CROPS_TARGET_2_ROOT} \
  ${CROPS_SOURCE_3_ROOT} \
  ${CROPS_TARGET_3_ROOT}

WORKDIR /app

# copy essential files
COPY ./config ./config
COPY LICENSE ./
COPY package*.json ./

# install node modules & remove cache
RUN npm ci --omit=dev && npm cache clean --force

# copy dist files from build stage
COPY --from=builder /app/dist ./dist

# expose volumes 
VOLUME ${CROPS_CONFIG_DIR} \
       ${CROPS_TEMP_DIR} \
       ${CROPS_LOG_DIR} \
       ${CROPS_SOURCE_ROOT} \
       ${CROPS_TARGET_ROOT} \
       ${CROPS_SOURCE_2_ROOT} \
       ${CROPS_TARGET_2_ROOT} \
       ${CROPS_SOURCE_3_ROOT} \
       ${CROPS_TARGET_3_ROOT} 

# expose port
EXPOSE ${CROPS_PORT}

# configure healthcheck
HEALTHCHECK --interval=5s \
            --timeout=3s \
            --retries=2 \
            CMD test -f /tmp/cronops_healthy

# define entry 
CMD ["node", "./dist/server.js"]