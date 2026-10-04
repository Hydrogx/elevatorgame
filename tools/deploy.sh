#!/bin/bash
# ============================================================
#  一键推送到 GitHub
#
#  用法：
#     tools/deploy.sh git@github.com:你的用户名/elevatorgame.git
#     tools/deploy.sh https://github.com/你的用户名/elevatorgame.git main
#
#  说明：仓库需要先在 GitHub 上建好（空的就行，不要勾选 README）。
# ============================================================
set -e
cd "$(dirname "$0")/.."

REMOTE="${1:?用法: tools/deploy.sh <仓库地址> [分支名，默认 main]}"
BRANCH="${2:-main}"

echo "▶ 仓库：$REMOTE    分支：$BRANCH"

if [ ! -d .git ]; then
  git init -b "$BRANCH"
fi

git add -A
git commit -m "喵喵电梯公寓：1F 糖果屋 / 2F 冰淇淋屋 / 3F 咖啡屋" || echo "（没有新的改动需要提交）"
git branch -M "$BRANCH"

git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"
git push -u origin "$BRANCH"

cat <<'TIP'

✅ 推送完成！接下来在 GitHub 网页上：
   1) 打开仓库 Settings → Pages
   2) Build and deployment → Source 选 “GitHub Actions”
   3) 等 Actions 跑完（约 1 分钟），访问：
      https://<你的用户名>.github.io/<仓库名>/
TIP
