# -------------------------------
# BUILD STAGE
# -------------------------------
FROM node:24-alpine AS builder

WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
RUN npm run test

# -------------------------------
# PRODUCTION STAGE
# -------------------------------
FROM node:24-alpine AS production

# add timezone support to alpine
RUN apk add --no-cache tzdata

# environment variables
ENV CRONOPS_CONFIG_DIR=/config
ENV CRONOPS_CONFIG_FILE=jobs.yaml
ENV CRONOPS_SOURCE_ROOT=/source
ENV CRONOPS_TARGET_ROOT=/target
ENV CRONOPS_SOURCE_2_ROOT=/source2
ENV CRONOPS_TARGET_2_ROOT=/target2
ENV CRONOPS_SOURCE_3_ROOT=/source3
ENV CRONOPS_TARGET_3_ROOT=/target3
ENV CRONOPS_TEMP_DIR=/temp
ENV CRONOPS_PORT=8083
ENV NODE_ENV=production

# create folders
RUN mkdir -p ${CRONOPS_CONFIG_DIR}
RUN mkdir -p ${CRONOPS_SOURCE_ROOT}
RUN mkdir -p ${CRONOPS_TARGET_ROOT}
RUN mkdir -p ${CRONOPS_SOURCE_2_ROOT}
RUN mkdir -p ${CRONOPS_TARGET_2_ROOT}
RUN mkdir -p ${CRONOPS_SOURCE_3_ROOT}
RUN mkdir -p ${CRONOPS_TARGET_3_ROOT}
RUN mkdir -p ${CRONOPS_TEMP_DIR}

# copy essential files
WORKDIR /app
COPY ./config ./config
COPY package*.json .
COPY LICENSE .

# copy dist files from build stage
COPY --from=builder /app/dist ./dist

# install node modules 
RUN npm ci --omit=dev

# expose volumes 
VOLUME ${CRONOPS_CONFIG_DIR}
VOLUME ${CRONOPS_SOURCE_ROOT}
VOLUME ${CRONOPS_TARGET_ROOT}
VOLUME ${CRONOPS_SOURCE_2_ROOT}
VOLUME ${CRONOPS_TARGET_2_ROOT}
VOLUME ${CRONOPS_SOURCE_3_ROOT}
VOLUME ${CRONOPS_TARGET_3_ROOT}
VOLUME ${CRONOPS_TEMP_DIR}

# expose port
EXPOSE ${CRONOPS_PORT}

# configure healthcheck
HEALTHCHECK --interval=5s \
            --timeout=3s \
            --retries=2 \
            CMD test -f /tmp/cronops_healthy

# define entry 
CMD ["node", "./dist/server.js"]