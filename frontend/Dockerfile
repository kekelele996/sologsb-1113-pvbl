# ---------- 构建阶段：安装依赖并产出静态产物 ----------
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖清单，充分利用镜像层缓存
COPY package.json ./

# 使用 npm ci 保证依赖可复现；无 lock 文件时回退到 npm install
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# 复制源码并执行类型检查 + 生产构建（零错误）
COPY tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm run build

# ---------- 运行阶段：nginx 托管静态产物 ----------
FROM nginx:alpine AS runner

# 自定义 nginx 配置：SPA fallback + gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 覆盖默认站点产物
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

# 兜底修正静态产物权限：宿主机源文件若为 0600（如 public/favicon.svg），COPY 会原样保留权限，
# nginx worker 以 nginx 用户运行将读不到文件并返回 403，必须显式放开读权限
RUN chmod -R a+rX /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
