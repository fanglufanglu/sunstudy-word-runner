# GitHub Pages 发布说明

这个项目是纯静态网页，可以直接用 GitHub Pages 发布。

## 推荐方式

1. 在 GitHub 新建一个公开仓库，例如 `sunstudy-word-runner`。
2. 把本目录代码推送到该仓库的 `main` 分支。
3. 打开仓库 `Settings` -> `Pages`。
4. `Build and deployment` 选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. 保存后等待几分钟，访问：

```text
https://你的GitHub用户名.github.io/sunstudy-word-runner/
```

## 注意

- `.nojekyll` 用来关闭 GitHub Pages 的 Jekyll 处理，确保 JS、manifest 和离线缓存文件原样发布。
- 如果改了代码，重新提交并推送到 `main`，GitHub Pages 会自动更新。
- GitHub Pages 在中国大陆访问可能不稳定，不适合作为强稳定长期方案。
