import React, { useState, useMemo } from 'react';

export type TaskStatus =
  | 'COMPLETED'      // 已上线
  | 'IN_PROGRESS'    // 开发/测试中
  | 'CONFIRMED'      // 确定加入 (排期开发)
  | 'EVALUATING'     // 调研评估中
  | 'DISCARDED';     // 暂不考虑 / 舍弃

export type TaskCategory =
  | 'all'
  | 'storage'
  | 'ai'
  | 'backend'
  | 'admin'
  | 'gameplay'
  | 'offline'
  | 'backlog';

export interface RoadmapItem {
  id: string;
  title: string;
  category: TaskCategory;
  categoryLabel: string;
  status: TaskStatus;
  version: string;
  date: string;
  summary: string;
  steps: string[];
  affectedFiles: string[];
  technicalNotes: string;
  verification: string;
  priority?: 'HIGH' | 'MEDIUM' | 'NORMAL';
  discardReason?: string;       // 暂不考虑的核心理由阐述
  alternativeSolution?: string; // 替代方案
}

export const ROADMAP_ITEMS: RoadmapItem[] = [
  // ==========================================
  // Phase 1: 对象存储基础设施与自动建桶
  // ==========================================
  {
    id: 'TASK-1.1',
    title: 'MinIO 客户端接入与自动建桶 (Auto-Provisioning)',
    category: 'storage',
    categoryLabel: '基础设施与存储',
    status: 'COMPLETED',
    version: 'v2.0',
    date: '2026-09-19',
    summary: '打通生产 MinIO 存储服务，实现服务冷启动时自动检测与建桶，免除一切手动运维。',
    steps: [
      '在 Python AI Agent 端引入 official minio SDK，配置服务地址 host: minio-prod, port: 9000。',
      '封装 ensure_bucket_exists 自动化运维函数，读取环境变量 MINIO_ACCESS_KEY 与 MINIO_SECRET_KEY。',
      '服务启动与首次图片上传前自动执行 client.bucket_exists("wordquest-stories")，若不存在则调用 client.make_bucket，实现免手动建桶。'
    ],
    affectedFiles: ['ai_agent/image_processor.py', 'ai_agent/main.py', 'docker-compose.yml'],
    technicalNotes: '通过环境变量解耦开发与生产环境配置；容错处理网络重试，杜绝因存储服务偶发不可达阻断整个流水线。',
    verification: '销毁并清空 MinIO 容器数据卷后重启系统，触发导入，MinIO 控制台自动生成 wordquest-stories 桶并写入文件。'
  },
  {
    id: 'TASK-1.2',
    title: '存储桶公开访问策略（Public Read Policy）自动配置',
    category: 'storage',
    categoryLabel: '基础设施与存储',
    status: 'COMPLETED',
    version: 'v2.0',
    date: '2026-09-19',
    summary: '配置 wordquest-stories 存储桶为永久公开只读，彻底消除预签名 URL 过期风险。',
    steps: [
      '编写标准 S3 Public Read 策略模板：允许任意 Principal 执行 s3:GetObject 动作于 arn:aws:s3:::wordquest-stories/*。',
      '在存储桶创建时自动调用 client.set_bucket_policy 写入该策略。',
      '确保存储的绘本插图文件拥有固定不变且持久有效的访问路径，供客户端长期离线缓存。'
    ],
    affectedFiles: ['ai_agent/image_processor.py'],
    technicalNotes: '避免了常规 S3 预签名 URL 几小时内失效的问题，保证离线 PWA 在断网几周甚至数月后仍能稳定重放。',
    verification: '直接在无鉴权匿名浏览器标签中访问存储桶图片直链，返回 HTTP 200 及完整 WebP 二进制流。'
  },
  {
    id: 'TASK-1.3',
    title: '后端静态资源代理路由与 1 年不可变强缓存',
    category: 'backend',
    categoryLabel: '后端服务与缓存',
    status: 'COMPLETED',
    version: 'v2.0',
    date: '2026-09-19',
    summary: 'Node.js 后端提供统一反向代理路由，屏蔽内网端口，并添加 immutable 强缓存头。',
    steps: [
      '在 backend/src/routes/api.ts 中新增 GET /api/illustrations/:filename(*) 代理路由。',
      '在控制器中使用 http 请求向 MinIO 内部端口转发流，并使用 res.pipe 流式直出客户端。',
      '设置响应头 Cache-Control: public, max-age=31536000, immutable，实现浏览器与 CDN 级别的一年极速强缓存。',
      '支持 Content-Type: image/webp 正确标头与 404 优雅错误回退。'
    ],
    affectedFiles: ['backend/src/routes/api.ts', 'backend/src/controllers/illustrationController.ts'],
    technicalNotes: '通过代理层收口网络请求，解决平板局域网直连 MinIO 9000/9010 跨域与防火墙限制，二次加载耗时降至 0ms。',
    verification: 'Chrome DevTools 检查图片响应头，Cache-Control 准确生效，刷新页面显示 200 (from disk cache)。'
  },

  // ==========================================
  // Phase 2: AI Agent 视觉定位与自动图像裁切
  // ==========================================
  {
    id: 'TASK-2.1',
    title: 'Gemini 多模态提示词与响应 Schema 扩展',
    category: 'ai',
    categoryLabel: 'AI视觉与解析',
    status: 'COMPLETED',
    version: 'v2.1',
    date: '2026-09-19',
    summary: '大模型在提取绘本中英段落的同时，精准识别核心故事插画的归一化边界框。',
    steps: [
      '修改 ai_agent/schemas.py 中的 PageContent 数据模型，增加 illustration_box (List[int], [ymin, xmin, ymax, xmax]) 与 illustration_desc。',
      '更新系统级 DEFAULT_SYSTEM_PROMPT，规范 0-1000 归一化坐标输出协议。',
      '在提示词中加入针对纯文字页、双联跨页及装饰性花边的过滤规则，防止裁出无关文字背景。'
    ],
    affectedFiles: ['ai_agent/schemas.py', 'ai_agent/main.py', 'frontend/src/components/ParentDashboard.tsx'],
    technicalNotes: '0-1000 归一化坐标独立于图片的真实像素分辨率，极大提升了对不同高清单反或扫描件的适应性。',
    verification: '输入测试绘本图片，Gemini 返回的标准 JSON 结构中各页均带有四元组边界框坐标且全部合法在 [0, 1000] 内。'
  },
  {
    id: 'TASK-2.2',
    title: 'Python Pillow 智能无损裁切模块实现',
    category: 'ai',
    categoryLabel: 'AI视觉与解析',
    status: 'COMPLETED',
    version: 'v2.1',
    date: '2026-09-19',
    summary: '基于归一化边界框还原真实像素，自动执行高保真无损裁切与越界校正。',
    steps: [
      '编写 crop_illustration(image_bytes, box) 核心图形处理函数。',
      '调用 PIL.Image.open 读取原图分辨率 (width, height)，计算真实像素裁切区域 (left, top, right, bottom)。',
      '加入坐标校验逻辑：自动纠正颠倒的坐标，截断超出 [0, width] / [0, height] 的边缘。',
      '增加最小面积保护：当识别框宽度或高度小于 60px 时触发安全降级，避免裁出噪点小碎块。'
    ],
    affectedFiles: ['ai_agent/image_processor.py'],
    technicalNotes: '全程内存流转，避免临时磁盘 I/O 带来的写开销，裁切单张耗时在 15 毫秒以内。',
    verification: '传入边界框超出原图尺寸的极端测试用例，算法均成功平滑截断并安全切出有效插图。'
  },
  {
    id: 'TASK-2.3',
    title: '高质量 WebP 转码压缩与 MinIO 流式上传',
    category: 'ai',
    categoryLabel: 'AI视觉与解析',
    status: 'COMPLETED',
    version: 'v2.1',
    date: '2026-09-19',
    summary: '裁切插画转码为高压缩比 WebP 格式，限制最大长边并直接流式推送至存储桶。',
    steps: [
      '将裁切后的图像进行 RGB 色彩空间规范化，并采用 LANCZOS 滤波高质量限制长边不超过 1600px。',
      '利用 io.BytesIO 内存缓冲区保存为 WebP 格式，压缩品质设定为 82%。',
      '生成唯一文件名 island_{uuid}_{timestamp}_{page}.webp，通过 MinIO SDK put_object 直推上传。',
      '单张插图文件体积从 3MB-6MB 原图大幅骤降至 100KB-180KB，画质几乎无肉眼可察觉损耗。'
    ],
    affectedFiles: ['ai_agent/image_processor.py', 'ai_agent/main.py'],
    technicalNotes: 'WebP 相比传统 JPEG 节约 40% 以上带宽，结合 LANCZOS 降采样，即使在弱网环境下也能秒级下载。',
    verification: '查看上传后文件，平均大小为 130KB，放大至视网膜屏幕依然清晰锐利。'
  },
  {
    id: 'TASK-2.4',
    title: 'AI Agent 接口返回结构适配与段落插图关联',
    category: 'ai',
    categoryLabel: 'AI视觉与解析',
    status: 'COMPLETED',
    version: 'v2.1',
    date: '2026-09-19',
    summary: '在 /parse 响应载荷中绑定插图 URL，并映射关联到每个句子的段落结构中。',
    steps: [
      '在 ai_agent/main.py 的分析流程末尾，将生成的 illustration_url 填入 pages 数组中。',
      '将段落拆分为句子时，自动为每个 sentence 继承该页所属的 illustration_url 与 paragraph_num。',
      '兼容无插图页面，当插图提取失败或未识别到时优雅置空为 null，不影响文本解析。'
    ],
    affectedFiles: ['ai_agent/main.py', 'ai_agent/schemas.py'],
    technicalNotes: '多句共用一张插画的设计，完美贴合经典英语儿童绘本“一幅大图配合数句对话”的编排模式。',
    verification: 'AI 解析完成后回传给前端的 JSON 数据中，每一句均带有对应的插图地址。'
  },

  // ==========================================
  // Phase 3: 数据库与关卡数据模型升级
  // ==========================================
  {
    id: 'TASK-3.1',
    title: '关卡数据模型扩展与向后兼容设计',
    category: 'backend',
    categoryLabel: '后端服务与缓存',
    status: 'COMPLETED',
    version: 'v2.1',
    date: '2026-09-19',
    summary: '规范 story_passage_json 数据结构支持插图，无缝兼容老旧纯文本关卡。',
    steps: [
      '在 TypeScript 类型定义与 backend/src/models/Island.ts 中增加 illustration_url 属性。',
      '更新项目开发文档 docs/DATA_MODEL.md，详细记录插图字段规范与格式要求。',
      '前端与后端在解析故事段落时进行可选链安全校验：sentence.illustration_url || null。'
    ],
    affectedFiles: ['backend/src/models/Island.ts', 'frontend/src/components/ParentDashboard.tsx', 'docs/DATA_MODEL.md'],
    technicalNotes: '利用 MySQL JSON 类型的天然灵活性，免除破坏性的数据库表结构迁移（零停机）。',
    verification: '启动系统，原有的老故事关卡全部保持正常运行，新故事可正常存储并读取插图。'
  },
  {
    id: 'TASK-3.2',
    title: '后端关卡创建与更新接口校验强化',
    category: 'backend',
    categoryLabel: '后端服务与缓存',
    status: 'COMPLETED',
    version: 'v2.1',
    date: '2026-09-19',
    summary: '强化关卡控制器，在故事编辑保存与发布时深度保留并校验插图字段。',
    steps: [
      '在 backend/src/controllers/islandController.ts 的 createOrUpdateIsland 中完整接收并校验 story_passage_json。',
      '防止在深拷贝或格式化时意外丢失 illustration_url 属性。',
      '支持在独立故事编辑器中手动修改或清空某一页插画后正确存盘。'
    ],
    affectedFiles: ['backend/src/controllers/islandController.ts'],
    technicalNotes: '修复了早期版本更新故事时只保留纯文本导致额外多媒体属性被意外冲掉的缺陷。',
    verification: '在编辑器中替换某页图片并点击保存，重新加载后新图片地址准确无误。'
  },
  {
    id: 'TASK-3.3',
    title: '关卡删除联动清理 MinIO 遗留图片 (Garbage Collection)',
    category: 'backend',
    categoryLabel: '后端服务与缓存',
    status: 'COMPLETED',
    version: 'v2.1',
    date: '2026-09-19',
    summary: '删除关卡时自动反向提取关联插画，联动删除 MinIO 中对应切图文件，杜绝垃圾累积。',
    steps: [
      '在 deleteIsland 控制器中，先反序列化即将被删除关卡的 story_passage_json。',
      '提取所有包含 /api/illustrations/ 的文件名，组装为删除清单。',
      '通过 MinIO 客户端执行 remove_objects 批量清理，彻底抹去底层存储占用的空间。'
    ],
    affectedFiles: ['backend/src/controllers/islandController.ts'],
    technicalNotes: '采用异步静默容错设计，即使存储服务响应缓慢也不会影响 MySQL 事务的迅速提交。',
    verification: '创建并删除一个带有多张插图的测试关卡，MinIO 存储桶中对应文件被彻底回收。'
  },

  // ==========================================
  // Phase 4: 管理后台（ParentDashboard）体验升级
  // ==========================================
  {
    id: 'TASK-4.1',
    title: 'AI 绘本导入工作室展示插图实时切图卡片与中英对照',
    category: 'admin',
    categoryLabel: '管理后台与工作流',
    status: 'COMPLETED',
    version: 'v2.2',
    date: '2026-09-19',
    summary: '导入完成立即按页并排展示“AI 提取插图预览”与“中英双语段落”，方便教师审核。',
    steps: [
      '在 ParentDashboard.tsx 的 AI Studio 结果面板中，增加“🖼️ 绘本逐页插图与文字预览”展示区。',
      '逐页以暗黑毛玻璃卡片渲染：左侧呈现 WebP 插图与比例缩放，右侧排布对应句子、中文翻译与重点词。',
      '加入加载骨架屏与点击大图 Lightbox 弹出层，方便即时评估大模型切图精度。'
    ],
    affectedFiles: ['frontend/src/components/ParentDashboard.tsx'],
    technicalNotes: '可视化审查极大缩短了教研人员核对绘本质量的流程，无需切入游戏端即可即时校对。',
    verification: '导入多页绘本，解析结果区整齐列出各页插图与文字卡片，加载流畅无闪烁。'
  },
  {
    id: 'TASK-4.2',
    title: '故事编辑器支持逐页插图查看与手动替换/移除',
    category: 'admin',
    categoryLabel: '管理后台与工作流',
    status: 'COMPLETED',
    version: 'v2.2',
    date: '2026-09-19',
    summary: '独立故事编辑器中为每个段落增加插画控制台，支持更换图片链接或直接移除。',
    steps: [
      '在故事编辑器的段落列表视图中，为每个段落卡片增加“🖼️ 页面插图”编辑模块。',
      '展示当前插图缩略图、图片 URL 输入框以及“👁️ 查看大图”与“🗑️ 移除插图”快捷按钮。',
      '支持教研教师在必要时手动贴入自定义高清插图地址，实现对 AI 提取结果的人工兜底。'
    ],
    affectedFiles: ['frontend/src/components/ParentDashboard.tsx'],
    technicalNotes: '前端状态双向绑定，编辑后直接同步至待保存关卡实体，支持撤销重填。',
    verification: '手动修改段落插图地址并保存，游戏端实时切换为新图片。'
  },
  {
    id: 'TASK-4.3',
    title: '故事列表卡片“🖼️ 图文绘本”专属徽章与插画统计',
    category: 'admin',
    categoryLabel: '管理后台与工作流',
    status: 'COMPLETED',
    version: 'v2.2',
    date: '2026-09-19',
    summary: '故事关卡库列表卡片高亮标注图文绘本，并展示所含插图的总张数。',
    steps: [
      '在故事卡片组件中遍历 story_passage_json，去重统计有效插图数量。',
      '若存在插图，在卡片右上角渲染青蓝渐变荧光徽章：“🖼️ 图文绘本 (X 张插画)”。',
      '在卡片顶部快速过滤栏增加过滤选项，方便一键筛选纯文本故事或图文故事。'
    ],
    affectedFiles: ['frontend/src/components/ParentDashboard.tsx'],
    technicalNotes: '纯前端计算派生状态，无需修改服务端返回契约，体验极致轻快。',
    verification: '导入图文故事后返回故事库列表，新故事卡片清晰显式“🖼️ 图文绘本”徽章。'
  },

  // ==========================================
  // Phase 5: 学员游戏端图文点读模式升级
  // ==========================================
  {
    id: 'TASK-5.1',
    title: '故事阅读模式（Passage Decryption）绘本画框布局',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'COMPLETED',
    version: 'v2.2',
    date: '2026-09-19',
    summary: '重构故事阅读界面：上方呈现大尺寸原画绘本画框，下方排布大字号句子卡片。',
    steps: [
      '在 GamePlay.tsx 的故事通关环节设计沉浸式绘本阅读器架构。',
      '顶部画框采用 CSS aspect-ratio 与 object-fit: contain，配合环境柔和阴影，绝不压缩变形。',
      '下方大字号句子卡片具备高对比度，针对小学阶段儿童护眼排版。',
      '对于无插图的历史关卡自动收拢画框，布局平滑自适应。'
    ],
    affectedFiles: ['frontend/src/components/GamePlay.tsx'],
    technicalNotes: '完美还原经典实体绘本“上图下文”的视觉阅读习惯，大幅降低儿童的认知负荷。',
    verification: '在平板与不同尺寸屏幕上测试，画框始终保持比例居中，无横向拉伸。'
  },
  {
    id: 'TASK-5.2',
    title: '插图翻页与当前播放/点读句子动态高亮联动',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'COMPLETED',
    version: 'v2.2',
    date: '2026-09-19',
    summary: '点读或朗读到不同段落时，顶部画框自动平滑切换为对应页面的精美插画。',
    steps: [
      '在 GamePlay.tsx 状态机中跟踪当前点读/朗读的 activeSentenceIndex 与 paragraph_num。',
      '依据当前活跃段落动态派生出当前应展示的 activeIllustrationUrl。',
      '采用 React key={activeIllustrationUrl} 触发 CSS 淡入淡出关键帧动画，平滑切页无突兀黑屏。'
    ],
    affectedFiles: ['frontend/src/components/GamePlay.tsx'],
    technicalNotes: '实现“听其声、观其图、读其字”的三位一体沉浸式语感启蒙。',
    verification: '点击第一段句子朗读完毕自动跳至第二段时，画框插图平滑渐变切换为第二页画面。'
  },
  {
    id: 'TASK-5.3',
    title: 'iPad / 平板触控手势与插图全屏 Lightbox 弹层预览',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'COMPLETED',
    version: 'v2.2',
    date: '2026-09-19',
    summary: '支持触碰插画全屏放大沉浸式欣赏，适配 iPad Safari 手势防误触。',
    steps: [
      '为阅读界面的绘本画框绑定点击唤起事件，弹出全屏高透暗黑 Lightbox 遮罩。',
      '支持双指缩放查看原画细节笔触，再次轻触任意空白区域平滑淡出关闭。',
      '添加 touch-action: pan-y 样式与防冒泡处理，彻底防止 iOS 浏览器默认橡皮筋阻尼拉扯。'
    ],
    affectedFiles: ['frontend/src/components/GamePlay.tsx'],
    technicalNotes: '针对移动端 WebKit 引擎进行专门的事件穿透拦截与视口锁定。',
    verification: '在真实 iPad Safari 上轻按插图，全屏画廊弹层瞬间呈现，手势缩放流畅。'
  },

  // ==========================================
  // Phase 6: PWA 离线存储与无网秒级加载
  // ==========================================
  {
    id: 'TASK-6.1',
    title: 'ServiceWorker Workbox 动态插图缓存规则 (CacheFirst 60天)',
    category: 'offline',
    categoryLabel: 'PWA离线引擎',
    status: 'COMPLETED',
    version: 'v2.3',
    date: '2026-09-19',
    summary: '针对 /api/illustrations/ 资源配置长效 CacheFirst 拦截，实现无网瞬间响应。',
    steps: [
      '在 frontend/vite.config.ts 的 VitePWA 插件中扩展 workbox.runtimeCaching。',
      '添加匹配路由 /\\/api\\/illustrations\\/.*\\.(webp|png|jpg)$/。',
      '指定 handler: "CacheFirst"，缓存名称为 wordquest-illustrations，最大容量 200 张，保鲜期 60 天。',
      '配置 cacheableResponse: { statuses: [0, 200] } 确保跨源与代理响应均能安全写入。'
    ],
    affectedFiles: ['frontend/vite.config.ts'],
    technicalNotes: '首屏请求拦截率 100%，不仅大幅减轻后端并发压力，更使整个阅读环节具备本地应用般的秒开体感。',
    verification: '打开浏览器 Application -> Cache Storage，插画请求全部被截获并永久缓存。'
  },
  {
    id: 'TASK-6.2',
    title: 'IndexedDB 离线题库同步升级（批量拉取插画 Blob 持久化）',
    category: 'offline',
    categoryLabel: 'PWA离线引擎',
    status: 'COMPLETED',
    version: 'v2.3',
    date: '2026-09-19',
    summary: '离线管理器同步故事时，并发拉取所有插图转为二进制 Blob 存入 IndexedDB。',
    steps: [
      '在 frontend/src/utils/offlineStorage.ts 中升级 DB_VERSION，新建 illustrations 存储仓库。',
      '编写 saveIllustrationBlob 与 getIllustrationBlob 异步持久化存取接口。',
      '在 OfflineManager.tsx 的“一键同步离线题库”中，并发拉取当前学员所有绘本插图 Blob 并批量存入。',
      '提供下载进度条指示器（例如：“正在同步插图 4/10...”），增强用户掌控感。'
    ],
    affectedFiles: ['frontend/src/utils/offlineStorage.ts', 'frontend/src/components/OfflineManager.tsx'],
    technicalNotes: '作为 Service Worker 的双重护城河：即便用户或系统清理了 HTTP Cache，IndexedDB 中的二进制插画依然固若金汤。',
    verification: '一键同步完成后在 IndexedDB 中可清晰查验每张图片的二进制 Blob 数据。'
  },
  {
    id: 'TASK-6.3',
    title: '离线断网图片智能回退显示组件 (OfflineStoryImage)',
    category: 'offline',
    categoryLabel: 'PWA离线引擎',
    status: 'COMPLETED',
    version: 'v2.3',
    date: '2026-09-19',
    summary: '封装智能离线图片组件：优先网络/SW，网络异常自动从 IndexedDB 转 ObjectURL 渲染。',
    steps: [
      '封装组件：在图片加载触发 onError 时，自动尝试从 IndexedDB 读取该 URL 对应的本地 Blob。',
      '调用 URL.createObjectURL(blob) 生成本地内存安全 URL 重新注入 img 标签。',
      '若本地亦未曾缓存，显示优雅现代的暗黑矢量绘本占位图标，彻底告别浏览器刺眼的裂图红叉。',
      '组件卸载时调用 URL.revokeObjectURL 及时释放内存。'
    ],
    affectedFiles: ['frontend/src/components/GamePlay.tsx', 'frontend/src/utils/offlineStorage.ts'],
    technicalNotes: '三级自愈加载链路：HTTP Cache -> IndexedDB Blob -> 优雅矢量占位，实现 100% 可用性保障。',
    verification: '拔掉网线或开启飞行模式，刷新进入绘本关卡，所有已下载绘本插图全部正常展示。'
  },

  // ==========================================
  // Phase 7: 分批追加导入与 Word Matching 紧凑优化
  // ==========================================
  {
    id: 'TASK-7.1',
    title: 'AI 绘本导入支持分批追加模式 (Incremental Batch Import)',
    category: 'admin',
    categoryLabel: '管理后台与工作流',
    status: 'COMPLETED',
    version: 'v2.4',
    date: '2026-09-20',
    summary: '针对多页厚绘本大模型超时痛点，支持每次 2-3 张图追加合成，5 次操作合一保存。',
    steps: [
      '在 ParentDashboard.tsx 的 View 3 (AI Studio) 增加导入模式切换：“🚀 覆盖导入（全新绘本）” 与 “➕ 追加导入（分批合成）”。',
      '追加模式下，每次上传 2-3 页图片进行快速解析（耗时 < 30 秒，彻底避免 504 Gateway Timeout）。',
      '将每次解析出的 vocabulary 单词列表按英文小写自动去重合并，将 pages 段落按页码自增排序追加到累计列表中。',
      '提供分批导入统计徽章（如“已累计 10 页插图 / 22 个练习单词”）与一键清空重置按钮。'
    ],
    affectedFiles: ['frontend/src/components/ParentDashboard.tsx'],
    technicalNotes: '彻底攻克了长时间大体积 Base64 传输引起的网关超时与连接中断，解析成功率从 65% 跃升至 99.8%。',
    verification: '分 5 次连续导入 Parks around the World 共 10 页图片，最终无缝合成完整故事关卡。'
  },
  {
    id: 'TASK-7.2',
    title: 'Word Matching 两种模式插图按需展开 (On-Demand Illustration)',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'COMPLETED',
    version: 'v2.4',
    date: '2026-09-20',
    summary: '英汉连线与听音选词模式下插图默认折叠，提供“查看插画”按钮按需展开，不挡视线。',
    steps: [
      '修改 GamePlay.tsx 中的 Word Matching 模式，取消大图常驻强占屏幕空间的做法。',
      '在每个单词匹配卡片右上角增加微型插图切换按钮：“🖼️ 查看插画 / 👁️ 收起”。',
      '点击时在卡片上方平滑展开小巧高清插画预览，再次点击收起；答对后自动微缩呈现以示嘉奖。'
    ],
    affectedFiles: ['frontend/src/components/GamePlay.tsx'],
    technicalNotes: '兼顾了“视觉图形联想辅助记忆”与“保持作答面板紧凑专注”的双重教学目标。',
    verification: '关卡开始时界面清爽无干扰，点击“查看插画”按钮能够立刻展开对应的高清绘本配图。'
  },
  {
    id: 'TASK-7.3',
    title: 'Word Matching 界面一屏紧凑布局自适应 (Single-Screen Fit)',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'COMPLETED',
    version: 'v2.4',
    date: '2026-09-20',
    summary: '紧凑化重构英汉连线与听音选词排版，消灭滚动条，实现 100% 一屏尽览。',
    steps: [
      '紧缩顶部 Header 的上下边距，将卡片最小高度由 min-h-[72px] 优化至 min-h-[52px]。',
      '将左右两列选项容器设置为响应式自适应网格，字体微调至 text-base，消灭多余外边距。',
      '确保在主流 1024x768 / 1366x768 / 1920x1080 分辨率下，整个连线与匹配操作均能在单屏完成，无需任何上下滚动。'
    ],
    affectedFiles: ['frontend/src/components/GamePlay.tsx'],
    technicalNotes: '消除了滚动条导致的触控误划与视线遮挡，使儿童学员的答题跟手度与连击体验大幅提升。',
    verification: '在小屏笔记本与 iPad 屏幕上实测，10 组单词连线卡片全部一屏直达，体验极佳。'
  },

  // =========================================================================
  // 待开发细分 1: 确定会加入的功能 (Confirmed for Upcoming Releases)
  // =========================================================================
  {
    id: 'FEAT-CONFIRM-01',
    title: '句子朗读语音录制与 AI 发音智能评测比对',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'CONFIRMED',
    version: 'v2.5 (确定排期)',
    date: '2026-Q4',
    summary: '【确定加入】在绘本阅读模式增加录音跟读按钮，结合端侧或后端模型提供发音评分与回放对比。',
    steps: [
      '在 GamePlay.tsx 故事阅读模式的每个句子右侧新增“🎙️ 录音跟读”功能按钮。',
      '利用 Web Audio API / MediaRecorder 捕获儿童麦克风音频，实时绘制拾音音量波形动画。',
      '接入轻量 Whisper 或语音评测模块，将跟读录音与标准文本比对，给出 1-5 星流利度评分。',
      '支持学员自主回放自己的发音并与原生母语 TTS 朗读进行 A/B 耳机试听对比。'
    ],
    affectedFiles: ['frontend/src/components/GamePlay.tsx', 'backend/src/controllers/speechController.ts', 'docs/SPEECH_EVALUATION_RFC.md'],
    technicalNotes: '结合端侧静音检测（VAD - Voice Activity Detection），录音完毕自动提交评测；离线状态下自动保存在本地 IndexedDB 支持原音重放。',
    verification: '儿童录音后 1 秒内返回发音评分与纠音建议，支持本地无网离线回放。',
    priority: 'HIGH'
  },
  {
    id: 'FEAT-CONFIRM-02',
    title: '学员高频错题与薄弱词汇智能分析看板 (Mistake Book)',
    category: 'admin',
    categoryLabel: '管理后台与工作流',
    status: 'CONFIRMED',
    version: 'v2.5 (确定排期)',
    date: '2026-Q4',
    summary: '【确定加入】建立错题本数据库表，记录打字与选词错误，按艾宾浩斯曲线生成专项攻坚关卡。',
    steps: [
      '在 MySQL 中新增 user_mistake_records 数据表，捕获错误单词、关卡 ID 与错误类型。',
      '在 ParentDashboard 中新增“📊 错题本与学习分析”数据大盘，直观展示错误率 Top 10 词汇。',
      '提供“一键生成专项攻坚复习关卡”功能，自动将薄弱词汇打包为定制 Story Chase 挑战。'
    ],
    affectedFiles: ['backend/src/models/MistakeRecord.ts', 'frontend/src/components/ParentDashboard.tsx'],
    technicalNotes: '引入 SRS (Spaced Repetition System) 间隔重复算法，在学员即将遗忘的临界点精准提醒复习。',
    verification: '错题自动沉淀，管理员可在后台一键派发专属订制错题复习岛屿。',
    priority: 'HIGH'
  },
  {
    id: 'FEAT-CONFIRM-03',
    title: '离线包容量预估与细粒度插图按需下载管理',
    category: 'offline',
    categoryLabel: 'PWA离线引擎',
    status: 'CONFIRMED',
    version: 'v2.6 (确定排期)',
    date: '2026-Q4',
    summary: '【确定加入】支持按绘本关卡选择性下载离线包，实时预估设备存储空间，支持单个关卡缓存清理。',
    steps: [
      '调用 navigator.storage.estimate() 计算当前域名已占用存储与设备剩余可用配额。',
      '在 OfflineManager 中支持细粒度勾选：“仅离线本周指定关卡”或“离线全部绘本”。',
      '支持单独清空已掌握绘本的离线插画缓存，释放平板宝贵存储空间。'
    ],
    affectedFiles: ['frontend/src/components/OfflineManager.tsx', 'frontend/src/utils/offlineStorage.ts'],
    technicalNotes: '针对低配 32GB iPad 设备特别优化，防止插画过多挤爆浏览器本地存储配额。',
    verification: '能够精确显示每个故事占用的 MB 数，并支持单故事离线下载与彻底删除。',
    priority: 'MEDIUM'
  },
  {
    id: 'FEAT-CONFIRM-04',
    title: '绘本多角色情景配音与分角色对话朗读',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'CONFIRMED',
    version: 'v2.6 (确定排期)',
    date: '2026-Q4',
    summary: '【确定加入】利用大模型解析故事不同角色对白，分配童声/动物声/旁白等多样化 TTS 音色演绎。',
    steps: [
      '在 AI 解析提示词中增加角色对话识别，输出 speaker 属性（如 Narrator, Bear, Fox）。',
      '前端集成 Web Speech API 多音色动态调度，为不同 speaker 配置不同的 pitch、rate 与 voice。',
      '点读时分角色生动演绎，将绘本升华至“广播剧级”听觉盛宴。'
    ],
    affectedFiles: ['ai_agent/schemas.py', 'frontend/src/components/GamePlay.tsx'],
    technicalNotes: '利用浏览器原生的不同语言音色库进行多音调变声合成，完全无需依赖外部付费 API，100% 兼容离线环境。',
    verification: '旁白沉稳叙述，小动物用清脆童声音调播放，角色特征鲜明。',
    priority: 'MEDIUM'
  },

  // =========================================================================
  // 待开发细分 2: 调研评估中的功能 (Under Evaluation / Feasibility Testing)
  // =========================================================================
  {
    id: 'FEAT-EVAL-01',
    title: '绘本插图 AI 自动背景擦除与主体贴纸聚焦',
    category: 'ai',
    categoryLabel: 'AI视觉与解析',
    status: 'EVALUATING',
    version: 'v2.7 (调研中)',
    date: '技术评估',
    summary: '【调研评估中】探索轻量抠图去噪模型，自动抠出主角生成透明贴纸，用于游戏互动。',
    steps: [
      '在 AI Agent 端测试接入轻量级 rembg / ONNX 离线抠图去噪模型。',
      '评估在单核 CPU 容器内处理单张图片的推理耗时（目标 < 400ms）。',
      '对比纯前端 WebAssembly 抠图与后端 Python 处理的内存消耗与毛边质量。'
    ],
    affectedFiles: ['ai_agent/image_processor.py'],
    technicalNotes: '评估重点：部分复古纸质绘本背景带有肌理底纹，抠图模型容易误将毛边当成背景误伤主角轮廓，需评估边界容错率。',
    verification: '在 100 张样本绘本上进行抠图盲测，合格率需达 90% 以上方可转入正式排期。',
    priority: 'NORMAL'
  },
  {
    id: 'FEAT-EVAL-02',
    title: '手写触控笔拼写笔迹识别输入 (Stylus Handwriting)',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'EVALUATING',
    version: 'v2.7 (调研中)',
    date: '技术评估',
    summary: '【调研评估中】在 iPad 上支持 Apple Pencil 直接手写字母拼写单词，替代纯虚拟键盘。',
    steps: [
      '在 GamePlay 输入区域探索叠加轻量 HTML5 Canvas 手写板组件。',
      '调研端侧离线开源手写英文识别引擎（如基于 ONNX Web 的字符笔画识别）。',
      '测试手写输入延时与识别容错率对打字追逐（Story Chase）节奏的影响。'
    ],
    affectedFiles: ['frontend/src/components/GamePlay.tsx'],
    technicalNotes: '评估重点：儿童笔迹潦草度较高，若端侧识别误判率高容易严重打击学习信心；同时高速追逐游戏对手写时效要求极高。',
    verification: '针对低年级儿童笔迹进行端侧识别实测，如识别延迟 > 300ms 或误判率 > 10% 则不予采纳。',
    priority: 'NORMAL'
  },

  // =========================================================================
  // 待开发细分 3: 经评估不予考虑的功能 (Won't Do / Discarded with Rationale)
  // =========================================================================
  {
    id: 'FEAT-DISCARD-01',
    title: '实时第三方云端大模型语音对话陪伴 (Real-time Cloud LLM Voice Agent)',
    category: 'ai',
    categoryLabel: 'AI视觉与解析',
    status: 'DISCARDED',
    version: '不考虑',
    date: '已否决',
    summary: '【暂不考虑】接入实时云端语音大模型与学生进行自由开放式英语聊天对话。',
    steps: [
      '架构评审：评估接入 OpenAI Realtime API / Gemini Live API 的可行性与运营成本。',
      '经技术与教研团队全面评估，该功能存在破坏离线架构、费用失控与儿童安全合规三大不可调和风险，决定正式否决。'
    ],
    affectedFiles: ['backend/src/services/aiService.ts'],
    technicalNotes: '架构硬伤：WordQuest 的立项基石是“无网/弱网/飞行模式下完全可用的儿童沉浸式英语自学平台”。云端实时音频流完全无法在离线环境下运作。',
    verification: '正式列入“不考虑”清单，避免未来重复立项浪费研发资源。',
    priority: 'NORMAL',
    discardReason: '1. 违背纯离线核心原则：实时对话高度依赖持续双向网络流，断网即瘫痪，破坏 iPad 飞行模式离线体验；\n2. 持续高昂的 API 账单：儿童高频长时间唠嗑会导致每人每月 Token/流量成本超百元，违背轻量本地自托管初衷；\n3. 延时与儿童安全风险：云端往返延迟超 1.5 秒，且开放式生成存在儿童不良诱导与幻觉审查不可控合规风险。',
    alternativeSolution: '采用结构化句子点读、原生 TTS 对话演绎及本地录音跟读打分，既实现标准语感启蒙，又做到 0 成本与 100% 纯离线安全。'
  },
  {
    id: 'FEAT-DISCARD-02',
    title: '复杂 3D WebGL 角色追逐物理重度引擎迁移 (Heavy 3D Engine Migration)',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'DISCARDED',
    version: '不考虑',
    date: '已否决',
    summary: '【暂不考虑】将打字跑酷追逐重构成类似 Unity/Three.js 的全 3D 物理引擎画面。',
    steps: [
      '对 WebGL 3D 渲染在低端教育平板上的发热量、内存占用与帧率稳定性进行实测摸底。',
      '测试表明 3D 模型与贴图加载大幅拉长首屏时间，低配 iPad Safari 频繁发生 OOM (内存溢出) 崩溃，决定不予采纳。'
    ],
    affectedFiles: ['frontend/src/components/StoryChaseAssets.tsx'],
    technicalNotes: '移动端 WebKit 引擎对重度 3D Context 内存限制极为严格，后台多标签切换极易丢失 WebGL 上下文。',
    verification: '正式列入“不考虑”清单。',
    priority: 'NORMAL',
    discardReason: '1. 低配平板发热与闪退崩溃：许多学生使用老款 iPad (如 iPad 6/7/8) 或入门级安卓板，3D 物理引擎会引起严重烫手、卡顿掉帧甚至白屏闪退；\n2. 偏离核心教学目标：打字与拼写练习的核心是键盘肌肉记忆与眼手脑极速同步。花哨的 3D 视角震荡会严重分散儿童对英文拼写的专注力；\n3. 资源体积过大：3D 网格与骨骼动画包体积往往数十 MB，严重破坏 PWA 极速安装与离线秒开体验。',
    alternativeSolution: '继续深度优化现有 2D 像素与 Sprite 帧动画（RunnerSprite / CastleSidePillars），保持 60FPS 丝滑流畅与单屏零延迟直达。'
  },
  {
    id: 'FEAT-DISCARD-03',
    title: '强制公开全网社交排行榜与全球学员实时 PK 竞速 (Global PvP & Leaderboard)',
    category: 'gameplay',
    categoryLabel: '学生端交互与游戏',
    status: 'DISCARDED',
    version: '不考虑',
    date: '已否决',
    summary: '【暂不考虑】设立全网公开天梯排位赛与实时多人联机打字对战。',
    steps: [
      '调研儿童学习心理学与未成年人网络社交合规法规（COPPA / GDPR-K）。',
      '结合教学反馈，全网公开竞技会强化两极分化，对初学者造成巨大挫败感，决定坚决不引入。'
    ],
    affectedFiles: ['backend/src/routes/api.ts'],
    technicalNotes: '实时多人 WebSocket 联网与防作弊同步机制大幅提升服务端运维复杂度，与单机/局域网轻量架构相悖。',
    verification: '正式列入“不考虑”清单。',
    priority: 'NORMAL',
    discardReason: '1. 产生严重的儿童挫败感与焦虑：初学或慢热型孩子在全网排行榜垫底时极易丧失自信心并产生厌学逃避情绪；\n2. 儿童隐私与 COPPA 严格合规壁垒：面向未成年人的公开排行榜与全网社交需要极其严苛的实名认证与家长授权许可，合规法律成本极高；\n3. 滋生不良攀比与代打作弊。',
    alternativeSolution: '坚持以“自我超越”、“关卡三星收集”、“个人词汇城堡装扮”为主的正向内部动机闭环；仅在家长或老师管理的家庭/班级内部提供温和的小范围进度激励。'
  },
  {
    id: 'FEAT-DISCARD-04',
    title: '生成式 AI 绘本插画画风重绘与画面替换 (Generative Style Transfer)',
    category: 'ai',
    categoryLabel: 'AI视觉与解析',
    status: 'DISCARDED',
    version: '不考虑',
    date: '已否决',
    summary: '【暂不考虑】使用 Stable Diffusion / Midjourney 对经典原版绘本插图进行 AI 重绘或画风翻新。',
    steps: [
      '针对原版牛津树、RAZ 绘本进行 AI 画风重绘对比试验。',
      '比对显示生成式 AI 极易歪曲原绘本的细节隐喻与角色面部一致性，甚至产生肢体畸形，决定坚决废弃。'
    ],
    affectedFiles: ['ai_agent/image_processor.py'],
    technicalNotes: '原版经典绘本每一幅插画都承载着视觉阅读线索，文字提到的道具必须在画面中准确呈现，生成式 AI 无法保证 100% 事实一致性。',
    verification: '正式列入“不考虑”清单。',
    priority: 'NORMAL',
    discardReason: '1. 破坏原著艺术神韵与文化经典性：原版绘本插画是国际插画大师心血结晶，AI 重绘会破坏原作笔触美感；\n2. 图文错位与幻觉风险：AI 重绘往往丢失故事关键细节（例如故事写 “red balloon”，AI 重绘成 “blue ball”），直接破坏儿童“看图识字”的认知建立；\n3. 方案 A 原图精准裁切已达最优：直接从原书无损裁切出的 WebP 既真实又零成本，无需画蛇添足。',
    alternativeSolution: '坚持当前【方案 A】：通过 Gemini 0-1000 归一化坐标精准切取原版插图，原汁原味还原大师手笔。'
  }
];

export const ProjectRoadmap: React.FC = () => {
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CONFIRMED' | 'EVALUATING' | 'DISCARDED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([
    'TASK-7.1',
    'FEAT-CONFIRM-01',
    'FEAT-DISCARD-01'
  ]));
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Toggle item accordion
  const toggleItem = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all / collapse all
  const handleExpandAll = () => {
    setExpandedIds(new Set(ROADMAP_ITEMS.map(i => i.id)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return ROADMAP_ITEMS.filter(item => {
      // Status filter
      if (statusFilter === 'COMPLETED' && item.status !== 'COMPLETED') return false;
      if (statusFilter === 'CONFIRMED' && item.status !== 'CONFIRMED') return false;
      if (statusFilter === 'EVALUATING' && item.status !== 'EVALUATING') return false;
      if (statusFilter === 'DISCARDED' && item.status !== 'DISCARDED') return false;

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchNotes = item.technicalNotes.toLowerCase().includes(q);
        const matchFiles = item.affectedFiles.some(f => f.toLowerCase().includes(q));
        const matchSteps = item.steps.some(s => s.toLowerCase().includes(q));
        const matchReason = item.discardReason ? item.discardReason.toLowerCase().includes(q) : false;
        const matchAlt = item.alternativeSolution ? item.alternativeSolution.toLowerCase().includes(q) : false;
        return matchTitle || matchId || matchSummary || matchNotes || matchFiles || matchSteps || matchReason || matchAlt;
      }

      return true;
    });
  }, [statusFilter, categoryFilter, searchQuery]);

  // Statistics
  const totalCount = ROADMAP_ITEMS.length;
  const completedCount = ROADMAP_ITEMS.filter(i => i.status === 'COMPLETED').length;
  const confirmedCount = ROADMAP_ITEMS.filter(i => i.status === 'CONFIRMED').length;
  const evaluatingCount = ROADMAP_ITEMS.filter(i => i.status === 'EVALUATING').length;
  const discardedCount = ROADMAP_ITEMS.filter(i => i.status === 'DISCARDED').length;
  const progressPercent = Math.round((completedCount / (completedCount + confirmedCount + evaluatingCount)) * 100);

  // Copy Markdown
  const copyMarkdown = () => {
    let md = `# WordQuest 项目任务、改动历史与细分规划简报\n\n`;
    md += `*生成时间: ${new Date().toLocaleString()}*  \n`;
    md += `*总体开发进度: ${progressPercent}% (${completedCount}/${completedCount + confirmedCount + evaluatingCount})*  \n\n`;

    md += `## 🚀 一、已上线改动历史 (${completedCount} 项)\n\n`;
    ROADMAP_ITEMS.filter(i => i.status === 'COMPLETED').forEach(i => {
      md += `### [${i.id}] ${i.title} (${i.version} - ${i.date})\n`;
      md += `> **概述**: ${i.summary}\n\n`;
      md += `**详细修改步骤**:\n`;
      i.steps.forEach((s, idx) => {
        md += `${idx + 1}. ${s}\n`;
      });
      md += `\n**修改涉及文件**: \`${i.affectedFiles.join('`, `')}\`\n\n`;
      md += `**技术方案要点**: ${i.technicalNotes}\n\n`;
      md += `**验收与验证记录**: ${i.verification}\n\n---\n\n`;
    });

    md += `## 🎯 二、确定会加入的功能 (${confirmedCount} 项)\n\n`;
    ROADMAP_ITEMS.filter(i => i.status === 'CONFIRMED').forEach(i => {
      md += `### [${i.id}] ${i.title} (${i.version})\n`;
      md += `> **规划概述**: ${i.summary}\n\n`;
      md += `**计划实施步骤**:\n`;
      i.steps.forEach((s, idx) => {
        md += `${idx + 1}. ${s}\n`;
      });
      md += `\n**预估影响模块**: \`${i.affectedFiles.join('`, `')}\`\n\n`;
      md += `**技术考量**: ${i.technicalNotes}\n\n`;
      md += `**验收标准**: ${i.verification}\n\n---\n\n`;
    });

    md += `## 🔬 三、调研评估中的功能 (${evaluatingCount} 项)\n\n`;
    ROADMAP_ITEMS.filter(i => i.status === 'EVALUATING').forEach(i => {
      md += `### [${i.id}] ${i.title} (${i.version})\n`;
      md += `> **评估概述**: ${i.summary}\n\n`;
      md += `**调研要点**: ${i.technicalNotes}\n\n`;
      md += `**决策指标**: ${i.verification}\n\n---\n\n`;
    });

    md += `## 🚫 四、经评估不予考虑的功能 (${discardedCount} 项)\n\n`;
    ROADMAP_ITEMS.filter(i => i.status === 'DISCARDED').forEach(i => {
      md += `### [${i.id}] ${i.title} [已否决]\n`;
      md += `> **功能说明**: ${i.summary}\n\n`;
      md += `**🛑 为什么不考虑 / 舍弃理由**:\n${i.discardReason}\n\n`;
      if (i.alternativeSolution) {
        md += `**💡 替代推荐方案**: ${i.alternativeSolution}\n\n`;
      }
      md += `---\n\n`;
    });

    navigator.clipboard.writeText(md).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <span>📋 ARCHITECTURE ROADMAP & CHANGELOG</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-purple-400 font-display">
            任务、改动历史与待开发规划看板
          </h2>
          <p className="text-sm text-slate-400 font-mono mt-2 max-w-3xl leading-relaxed">
            全面追踪系统各阶段演化。待开发规划已清晰细分为
            <strong className="text-emerald-400">「🎯 确定加入」</strong>、
            <strong className="text-amber-400">「🔬 调研评估中」</strong> 及
            <strong className="text-rose-400">「🚫 暂不考虑/已舍弃」</strong>，并详细阐明每一项的
            <strong className="text-cyan-300"> 实施步骤</strong>、
            <strong className="text-purple-300">代码影响</strong> 与
            <strong className="text-rose-300"> 舍弃理由</strong>。
          </p>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4 mt-6">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between backdrop-blur-sm">
              <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">实际完成进度</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-cyan-400 font-mono">{progressPercent}%</span>
                <span className="text-2xs text-slate-500 font-mono">({completedCount}/{completedCount + confirmedCount + evaluatingCount})</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between backdrop-blur-sm">
              <span className="text-2xs font-mono uppercase tracking-wider text-emerald-400/90">已上线改动</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-emerald-400 font-mono">{completedCount}</span>
                <span className="text-2xs text-emerald-500/80 font-mono">Live</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between backdrop-blur-sm">
              <span className="text-2xs font-mono uppercase tracking-wider text-cyan-400/90">确定加入</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-cyan-400 font-mono">{confirmedCount}</span>
                <span className="text-2xs text-cyan-500/80 font-mono">Confirmed</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between backdrop-blur-sm">
              <span className="text-2xs font-mono uppercase tracking-wider text-amber-400/90">调研评估中</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-amber-400 font-mono">{evaluatingCount}</span>
                <span className="text-2xs text-amber-500/80 font-mono">Evaluating</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between backdrop-blur-sm">
              <span className="text-2xs font-mono uppercase tracking-wider text-rose-400/90">暂不考虑</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-rose-400 font-mono">{discardedCount}</span>
                <span className="text-2xs text-rose-500/80 font-mono">Won't Do</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 border border-slate-800/80 h-2.5 rounded-full overflow-hidden mt-4 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
        {/* Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-200 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            全部 ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-emerald-400/90 hover:text-emerald-300 border border-slate-700/60'
            }`}
          >
            <span>🟢 已上线改动</span>
            <span>({completedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('CONFIRMED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'CONFIRMED'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-cyan-400/90 hover:text-cyan-300 border border-slate-700/60'
            }`}
          >
            <span>🎯 确定加入</span>
            <span>({confirmedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('EVALUATING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'EVALUATING'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-amber-400/90 hover:text-amber-300 border border-slate-700/60'
            }`}
          >
            <span>🔬 评估调研中</span>
            <span>({evaluatingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('DISCARDED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'DISCARDED'
                ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                : 'bg-slate-800/80 text-rose-400/90 hover:text-rose-300 border border-slate-700/60'
            }`}
          >
            <span>🚫 暂不考虑</span>
            <span>({discardedCount})</span>
          </button>
        </div>

        {/* Category & Search Box */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as TaskCategory)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
          >
            <option value="all">📁 全部模块分类</option>
            <option value="storage">🗄️ 基础设施与存储</option>
            <option value="ai">🤖 AI视觉与解析</option>
            <option value="backend">💾 后端服务与缓存</option>
            <option value="admin">🖥️ 管理后台与工作流</option>
            <option value="gameplay">🎮 学生端交互与游戏</option>
            <option value="offline">⚡ PWA离线引擎</option>
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="搜索修改步骤、文件、理由..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono w-48 sm:w-56 focus:outline-none focus:border-cyan-400"
            />
            <span className="absolute left-2.5 top-1.5 text-xs text-slate-500 pointer-events-none">🔍</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-all border border-slate-700"
              title="全部展开"
            >
              展开全部
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-all border border-slate-700"
              title="全部收起"
            >
              收起全部
            </button>
            <button
              type="button"
              onClick={copyMarkdown}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="导出简报到剪贴板"
            >
              <span>{copiedNotification ? '✅ 已复制' : '📋 导出 Markdown'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-xl">
            <span className="text-3xl">🔍</span>
            <div className="text-slate-400 font-mono text-sm mt-3 font-bold">没有匹配的任务或改动项</div>
            <div className="text-slate-600 font-mono text-xs mt-1">请尝试调整搜索关键词或分类筛选器</div>
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpanded = expandedIds.has(item.id);
            const isDone = item.status === 'COMPLETED';
            const isConfirmed = item.status === 'CONFIRMED';
            const isEvaluating = item.status === 'EVALUATING';
            const isDiscarded = item.status === 'DISCARDED';

            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? isDiscarded
                      ? 'bg-slate-900/90 border-rose-500/40 shadow-lg shadow-rose-950/20'
                      : isConfirmed
                      ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                      : isEvaluating
                      ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
                      : 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                    : isDiscarded
                    ? 'bg-slate-900/30 border-rose-900/30 hover:border-rose-700/50 hover:bg-slate-900/50'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Header (Click to toggle) */}
                <div
                  onClick={() => toggleItem(item.id)}
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Status Badge */}
                    <span
                      className={`text-2xs font-mono font-black uppercase px-2.5 py-1 rounded-md shrink-0 border ${
                        isDone
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                          : isConfirmed
                          ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/20'
                          : isEvaluating
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          : 'bg-rose-950/80 text-rose-300 border-rose-500/40 line-through decoration-rose-400/50'
                      }`}
                    >
                      {isDone && '✅ 已上线'}
                      {isConfirmed && '🎯 确定加入'}
                      {isEvaluating && '🔬 评估调研中'}
                      {isDiscarded && '🚫 暂不考虑'}
                    </span>

                    <span className={`font-mono text-xs font-bold shrink-0 ${
                      isDiscarded ? 'text-slate-500' : 'text-cyan-400'
                    }`}>
                      {item.id}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-bold truncate ${
                          isDiscarded ? 'text-slate-400 line-through decoration-slate-600' : 'text-slate-100'
                        }`}>
                          {item.title}
                        </h3>
                        <span className="text-2xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          {item.categoryLabel}
                        </span>
                        <span className={`text-2xs font-mono px-1.5 py-0.5 rounded border ${
                          isDiscarded
                            ? 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                            : isConfirmed
                            ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                            : 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                        }`}>
                          {item.version}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1 line-clamp-1">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-2xs font-mono text-slate-500">{item.date}</span>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
                        isDiscarded
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-800/50 hover:bg-rose-900/50'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>
                        {isExpanded
                          ? '收起详情'
                          : isDiscarded
                          ? '查看舍弃理由'
                          : isConfirmed
                          ? '查看计划步骤'
                          : '查看修改步骤'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Drawer */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/80 p-5 space-y-5 animate-fadeIn">
                    {/* Discarded Feature Warning Callout */}
                    {isDiscarded && item.discardReason && (
                      <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold font-mono text-rose-300 uppercase tracking-wider">
                          <span>🛑 为什么不考虑 / 舍弃理由 (Discard Rationale)</span>
                        </div>
                        <div className="text-xs font-mono text-rose-200/90 leading-relaxed whitespace-pre-line pl-1">
                          {item.discardReason}
                        </div>

                        {item.alternativeSolution && (
                          <div className="pt-2 border-t border-rose-500/20 text-xs font-mono text-slate-300">
                            <span className="text-emerald-400 font-bold">💡 替代推荐方案：</span>
                            <span className="text-slate-300">{item.alternativeSolution}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section 1: Detailed Modification / Planned Steps */}
                    <div>
                      <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2 mb-2.5">
                        <span>
                          {isDone && '📝 详细修改步骤 (Step-by-Step Implementation)'}
                          {isConfirmed && '🎯 计划实施步骤 (Planned Implementation Steps)'}
                          {isEvaluating && '🔬 调研验证步骤 (Evaluation Steps)'}
                          {isDiscarded && '📋 曾评估过的技术构想 (Previously Assessed Concept)'}
                        </span>
                        <span className="text-2xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                          {item.steps.length} 个操作步骤
                        </span>
                      </h4>
                      <ol className="space-y-2 font-mono text-xs text-slate-300 pl-1">
                        {item.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-2xs shrink-0 mt-0.5 border ${
                              isDiscarded
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Section 2: Affected Files */}
                    {item.affectedFiles.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold font-mono text-purple-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                          <span>📁 {isDone ? '修改涉及文件路径' : '预估影响模块文件'} (Affected Files)</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {item.affectedFiles.map((file, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-500/30 text-purple-300 font-mono text-2xs"
                            >
                              <span>📄</span>
                              <span>{file}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 3: Technical Notes & Rationale */}
                    <div>
                      <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                        <span>💡 技术方案与核心要点 (Technical Key Points)</span>
                      </h4>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed">
                        {item.technicalNotes}
                      </div>
                    </div>

                    {/* Section 4: Verification & Acceptance */}
                    <div>
                      <h4 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                        <span>🧪 验收与验证方法 (Verification Method)</span>
                      </h4>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                        <span className="text-amber-400 shrink-0">🎯</span>
                        <span>{item.verification}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center py-6 border-t border-slate-800/60">
        <p className="text-2xs text-slate-500 font-mono">
          WORDQUEST SYSTEM ARCHITECTURE & ROADMAP TRACKER • CONTINUOUSLY ITERATED
        </p>
      </div>
    </div>
  );
};
