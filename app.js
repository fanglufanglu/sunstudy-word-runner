const $ = (id) => document.getElementById(id);
const storeKey = "wordQuestProgress:v5";
const scenes = [
  { key: "plain", name: "校园夜跑道", mission: "沿跑道前进，读取词牌信号" },
  { key: "river", name: "地铁换乘站", mission: "穿过站台，破解下一块词牌" },
  { key: "mountain", name: "科技馆坡道", mission: "沿坡道上行，点亮词汇节点" },
  { key: "desert", name: "城市施工区", mission: "避开路障，找到目标词牌" },
  { key: "forest", name: "旧图书馆", mission: "穿过书架光影，收集线索" },
  { key: "ruins", name: "天台信号塔", mission: "登上天台，打开最终词门" }
];
const allUnits = window.FOCUS_UNITS || [];
const focusMeanings = window.FOCUS_MEANINGS || {};
const focusMeaningByKey = new Map(Object.entries(focusMeanings).map(([word, meaning]) => [normalizeWord(word), meaning]));
const wordByKey = new Map((window.WORDS || []).map((item) => [normalizeWord(item.word), item]));
const worldGroups = [...new Set((window.WORDS || []).map((item) => item.group).filter(Boolean))];
const sceneMissions = [
  { title: "档案潜入", brief: "进入教学楼，恢复散落的词汇档案", skin: "campus" },
  { title: "地铁追踪", brief: "穿过换乘站，截获下一批信号词", skin: "metro" },
  { title: "天台校准", brief: "避开警戒灯，修复屋顶信号节点", skin: "roof" },
  { title: "市集调查", brief: "在人群街区寻找隐藏线索", skin: "market" },
  { title: "图书馆夜巡", brief: "穿过书架区，解开封存词卡", skin: "library" },
  { title: "车站终局", brief: "启动出口系统，完成本轮转移", skin: "station" }
];
const objectCatalog = [
  { label: "终端机", action: "破解", className: "terminal", type: "spell" },
  { label: "储物柜", action: "搜索", className: "locker", type: "meaning" },
  { label: "门禁", action: "解锁", className: "gate-lock", type: "listen" },
  { label: "信号箱", action: "校准", className: "signal-box", type: "meaning" },
  { label: "档案柜", action: "翻找", className: "archive", type: "meaning" },
  { label: "公告屏", action: "读取", className: "billboard", type: "listen" },
  { label: "售票机", action: "验证", className: "kiosk", type: "spell" },
  { label: "实验台", action: "分析", className: "lab", type: "meaning" },
  { label: "工具箱", action: "组装", className: "toolbox", type: "spell" },
  { label: "书架", action: "检索", className: "bookcase", type: "listen" },
  { label: "中继器", action: "连接", className: "relay", type: "meaning" },
  { label: "无人机台", action: "接管", className: "drone-pad", type: "listen" }
];
const taskPlans = [
  {
    title: "地铁追踪",
    goalLabel: "有效情报",
    collectAction: "确认",
    intelNeeded: 2,
    finalLabel: "出口闸机",
    finalAction: "突围",
    finalClass: "gate-lock final-node",
    success: "路线坐标已确认，出口闸机开放验证",
    nodes: [
      { label: "监控回放", action: "接入", role: "intel", className: "intel-node camera-node", value: 1, reward: "锁定目标动线" },
      { label: "站台广播", action: "监听", role: "intel", className: "intel-node signal-node", value: 1, reward: "获得站台编号" },
      { label: "假通行码", action: "排除", role: "decoy", className: "decoy-node", value: 0, reward: "假线索，时间 -6s" },
      { label: "维修通道", action: "抄近路", role: "shortcut", className: "shortcut-node", value: 1, reward: "走捷径，警戒升高" }
    ]
  },
  {
    title: "图书馆夜巡",
    goalLabel: "档案证据",
    collectAction: "核对",
    intelNeeded: 2,
    finalLabel: "封存档案柜",
    finalAction: "解封",
    finalClass: "archive final-node",
    success: "档案链完整，封存档案柜可以解封",
    nodes: [
      { label: "借阅记录", action: "检索", role: "intel", className: "intel-node archive-chip", value: 1, reward: "找到关键词位置" },
      { label: "书架暗号", action: "比对", role: "intel", className: "intel-node book-node", value: 1, reward: "确认暗号来源" },
      { label: "过期索引", action: "核验", role: "decoy", className: "decoy-node", value: 0, reward: "索引过期，时间 -6s" },
      { label: "禁区书梯", action: "攀上", role: "shortcut", className: "shortcut-node", value: 1, reward: "快速定位，警戒升高" }
    ]
  },
  {
    title: "天台校准",
    goalLabel: "信号坐标",
    collectAction: "校准",
    intelNeeded: 2,
    finalLabel: "屋顶中继器",
    finalAction: "连接",
    finalClass: "relay final-node",
    success: "坐标稳定，屋顶中继器等待连接",
    nodes: [
      { label: "北侧天线", action: "校准", role: "intel", className: "intel-node signal-node", value: 1, reward: "北侧坐标稳定" },
      { label: "风速仪", action: "读取", role: "intel", className: "intel-node camera-node", value: 1, reward: "修正风速偏差" },
      { label: "干扰源", action: "识别", role: "decoy", className: "decoy-node", value: 0, reward: "干扰源误导，时间 -6s" },
      { label: "边缘小道", action: "穿越", role: "shortcut", className: "shortcut-node", value: 1, reward: "绕开楼梯，警戒升高" }
    ]
  },
  {
    title: "市集调查",
    goalLabel: "目标线索",
    collectAction: "追踪",
    intelNeeded: 2,
    finalLabel: "交易终端",
    finalAction: "锁定",
    finalClass: "terminal final-node",
    success: "目标身份缩小，交易终端可以锁定",
    nodes: [
      { label: "摊位账本", action: "翻查", role: "intel", className: "intel-node archive-chip", value: 1, reward: "找到交易时间" },
      { label: "匿名短信", action: "解析", role: "intel", className: "intel-node signal-node", value: 1, reward: "获得接头地点" },
      { label: "混淆名单", action: "筛查", role: "decoy", className: "decoy-node", value: 0, reward: "名单混淆，时间 -6s" },
      { label: "人群捷径", action: "穿过", role: "shortcut", className: "shortcut-node", value: 1, reward: "节省路线，警戒升高" }
    ]
  }
];
const sceneLayouts = [
  [{ x: 24, y: 68 }, { x: 58, y: 76 }, { x: 82, y: 36 }, { x: 42, y: 38 }],
  [{ x: 18, y: 34 }, { x: 35, y: 76 }, { x: 67, y: 55 }, { x: 84, y: 74 }, { x: 55, y: 24 }],
  [{ x: 28, y: 78 }, { x: 78, y: 76 }, { x: 46, y: 52 }, { x: 22, y: 24 }, { x: 82, y: 27 }],
  [{ x: 18, y: 72 }, { x: 50, y: 78 }, { x: 75, y: 57 }, { x: 36, y: 30 }, { x: 86, y: 24 }]
];
const challengeTypes = ["meaning", "listen", "spell"];
const objectInteractRadius = 15;

const state = {
  running: false,
  paused: false,
  mode: "unit",
  score: 0,
  streak: 0,
  seconds: 150,
  stars: 0,
  hearts: 3,
  revives: 0,
  outOfEnergy: false,
  distance: 0,
  sceneIndex: 0,
  unitIndex: Number(localStorage.getItem("wordQuestActiveUnit") || 0),
  worldMission: null,
  worldMissionDone: 0,
  current: null,
  challengeType: "meaning",
  bossActive: false,
  bossChain: 0,
  gateDeadline: 0,
  gateTimerId: null,
  playerX: 16,
  playerY: 22,
  targetX: null,
  targetY: null,
  sceneObjects: [],
  sceneProps: [],
  sceneHazards: [],
  sceneMission: null,
  taskPlan: null,
  taskGoal: 0,
  taskDone: 0,
  missionStep: 1,
  alertLevel: 0,
  hazardCooldown: 0,
  impactUntil: 0,
  dashUntil: 0,
  dashCooldownUntil: 0,
  shields: 0,
  currentObjectId: null,
  nearObjectId: null,
  nearObjectSince: 0,
  autoInteractDelayUntil: 0,
  touchMoving: false,
  joystickActive: false,
  joystickX: 0,
  joystickY: 0,
  sceneSkinIndex: 0,
  alertCooldown: 0,
  voices: [],
  keys: new Set(),
  loopId: null,
  timerId: null,
  progress: JSON.parse(localStorage.getItem(storeKey) || '{"known":{},"missed":{},"best":0,"stars":0}')
};

function normalizeWord(word) {
  return String(word || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function activeUnit() {
  return allUnits[state.unitIndex % Math.max(1, allUnits.length)] || null;
}

function resolveFocusWord(word, unit) {
  const focusMeaning = focusMeaningByKey.get(normalizeWord(word));
  const found = wordByKey.get(normalizeWord(word));
  if (found) return { ...found, meaning: focusMeaning || found.meaning, unit: unit?.id, unitName: unit?.name, focus: true };
  return {
    word,
    meaning: focusMeaning || "重点短语，先记住英文表达",
    band: `${unit?.name || "重点"} 重点`,
    group: unit?.title || "八上重点词",
    unit: unit?.id,
    unitName: unit?.name,
    focus: true
  };
}

function activeUnitWords(unit = activeUnit()) {
  return unit?.words?.map((word) => resolveFocusWord(word, unit)) || [];
}

function unitKnownMap(unit = activeUnit()) {
  state.progress.unitKnown = state.progress.unitKnown || {};
  if (!unit) return {};
  state.progress.unitKnown[unit.id] = state.progress.unitKnown[unit.id] || {};
  return state.progress.unitKnown[unit.id];
}

function unitMasteredCount(unit = activeUnit()) {
  const known = unitKnownMap(unit);
  return activeUnitWords(unit).filter((item) => (known[item.word] || 0) > 0).length;
}

function isUnitCleared(unit) {
  return Boolean(state.progress.units?.[unit.id]?.clearedAt);
}

function maxUnlockedUnitIndex() {
  if (!allUnits.length) return 0;
  let unlocked = 0;
  for (let index = 0; index < allUnits.length; index++) {
    if (index === 0 || isUnitCleared(allUnits[index - 1])) unlocked = index;
  }
  return unlocked;
}

function clampUnitIndex(index) {
  return Math.max(0, Math.min(Number(index) || 0, maxUnlockedUnitIndex()));
}

function createWorldMission() {
  const group = worldGroups[Math.floor(Math.random() * worldGroups.length)] || "A 字母岛";
  return {
    type: "group",
    group,
    goal: 8,
    title: `委托：收集 ${group.replace(" 字母岛", "")} 岛词牌`
  };
}

function equipmentLevel() {
  const coins = state.progress.coins || 0;
  if (coins >= 260) return 4;
  if (coins >= 150) return 3;
  if (coins >= 70) return 2;
  return 1;
}

function unlockedSceneCount() {
  return Math.min(scenes.length, equipmentLevel() + 2);
}

function challengeTypeFor(word) {
  if (state.bossActive) return ["meaning", "listen", "spell"][state.bossChain % 3];
  if (state.mode !== "unit") return Math.random() < 0.72 ? "meaning" : "listen";
  const known = unitKnownMap(activeUnit())[word.word] || 0;
  if (known === 0) return "meaning";
  return shuffle(["meaning", "listen", "spell"])[0];
}

function renderBattle() {
  const unit = activeUnit();
  const arena = $("exploreScene");
  if (!arena) return;
  if (!state.sceneObjects.length) prepareSceneObjects();
  arena.className = `explore-scene skin-${state.sceneMission?.skin || "campus"}`;
  const impactActive = Date.now() < state.impactUntil;
  $("gameStage").classList.toggle("danger-hit", impactActive);
  $("battleArena").classList.toggle("hit-alert", impactActive);
  $("battleZone").textContent = state.mode === "unit" && unit ? `${unit.name} · ${state.sceneMission?.title || unit.title}` : state.mode === "all" ? `城市大世界 Lv.${equipmentLevel()} · ${state.sceneMission?.title || "委托"}` : `错题训练场 · ${state.sceneMission?.title || "训练"}`;
  $("battleLog").textContent = state.battleLog || "拖动移动，避开巡逻扫描";
  const player = $("scenePlayer");
  player.classList.toggle("hit", impactActive);
  place(player, { x: state.playerX, y: state.playerY });
  renderSceneObjectButtons();
  renderSceneProps();
}

function renderSceneObjectButtons() {
  const container = $("sceneObjects");
  container.innerHTML = "";
  state.sceneObjects.filter(isObjectVisible).forEach((object) => {
    const button = document.createElement("button");
    const near = distanceTo(object) < objectInteractRadius;
    const locked = isObjectLocked(object);
    const active = isObjectActive(object);
    const status = object.done ? "完成" : locked ? `情报 ${intelText()}` : object.action;
    button.type = "button";
    button.className = `scene-object ${object.className}`;
    button.dataset.object = object.id;
    button.disabled = object.done;
    button.innerHTML = `<strong>${object.label}</strong><span>${status}</span>`;
    place(button, object);
    button.classList.toggle("near", near && !object.done);
    button.classList.toggle("done", object.done);
    button.classList.toggle("locked", locked);
    button.classList.toggle("ready", object.role === "final" && !locked && !object.done);
    button.classList.toggle("active-target", active);
    button.classList.toggle("inactive-target", !active && !object.done);
    button.title = object.done ? "已完成" : locked ? `有效情报不足：${intelText()}` : object.role === "final" ? "关键节点：完成单词验证" : object.reward || "靠近后行动";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      interactObject(object.id);
    });
    container.appendChild(button);
  });
}

function renderMissionTrack(container) {
  const active = activeMissionObjects();
  const points = [
    { x: state.playerX, y: state.playerY },
    ...state.sceneObjects.filter((item) => item.done && item.role !== "side").map((item) => ({ x: item.x, y: item.y })),
    ...(active.length ? [{ x: active[0].x, y: active[0].y }] : [])
  ];
  if (points.length > 1) {
    const route = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    route.setAttribute("class", "mission-route");
    route.setAttribute("viewBox", "0 0 100 100");
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points.map((point) => `${point.x},${100 - point.y}`).join(" "));
    route.appendChild(polyline);
    container.appendChild(route);
  }
}

function prepareSceneObjects() {
  const missionIndex = (state.sceneSkinIndex + Math.floor(Math.random() * sceneMissions.length)) % sceneMissions.length;
  const layout = sceneLayouts[state.sceneSkinIndex % sceneLayouts.length];
  const orderedLayout = [...layout].sort((a, b) => a.x - b.x);
  const plan = taskPlans[state.sceneSkinIndex % taskPlans.length];
  const taskGoal = plan.intelNeeded;
  const finalPoint = orderedLayout[orderedLayout.length - 1];
  state.sceneMission = sceneMissions[missionIndex];
  state.taskPlan = plan;
  state.taskGoal = taskGoal;
  state.taskDone = 0;
  state.missionStep = 1;
  state.alertLevel = 0;
  const nodeObjects = plan.nodes.slice(0, Math.min(plan.nodes.length, orderedLayout.length - 1)).map((node, index) => ({
    ...node,
    id: `${node.role}-${state.sceneSkinIndex}-${index}`,
    phase: index === 0 ? 1 : 2,
    done: false,
    x: orderedLayout[index].x,
    y: orderedLayout[index].y
  }));
  const sidePoint = orderedLayout.length > 5 ? orderedLayout[orderedLayout.length - 2] : null;
  const sideObject = sidePoint ? [{
    id: `side-${state.sceneSkinIndex}`,
    label: "临时补给",
    action: "拿取",
    className: "toolbox side-node",
    role: "side",
    done: false,
    reward: "恢复少量时间",
    x: sidePoint.x,
    y: sidePoint.y
  }] : [];
  state.sceneObjects = [
    ...nodeObjects,
    ...sideObject,
    {
      id: `final-${state.sceneSkinIndex}`,
      label: plan.finalLabel,
      action: plan.finalAction,
      className: plan.finalClass,
      role: "final",
      word: pickWord(),
      done: false,
      type: challengeTypes[state.sceneSkinIndex % challengeTypes.length],
      x: finalPoint.x,
      y: finalPoint.y
    }
  ];
  state.sceneProps = createSceneProps(layout);
  state.sceneHazards = createSceneHazards();
  state.currentObjectId = null;
  state.nearObjectId = null;
  state.nearObjectSince = 0;
  state.battleLog = missionInstruction();
}

function createSceneProps(layout) {
  const base = [
    { id: `bonus-${state.sceneSkinIndex}`, kind: "bonus", label: "补给", x: 14 + (state.sceneSkinIndex % 3) * 8, y: 18 + (state.sceneSkinIndex % 2) * 10, done: false },
    { id: `alert-${state.sceneSkinIndex}`, kind: "alert", label: "警戒区", x: 58 + (state.sceneSkinIndex % 2) * 14, y: 26 + (state.sceneSkinIndex % 3) * 8, done: false },
    { id: `speed-${state.sceneSkinIndex}`, kind: "speed", label: "加速带", x: 31 + (state.sceneSkinIndex % 2) * 18, y: 18 + (state.sceneSkinIndex % 3) * 9, cooldownUntil: 0 },
    { id: `gear-${state.sceneSkinIndex}`, kind: "gear", label: "装备箱", x: 74 - (state.sceneSkinIndex % 2) * 16, y: 72 - (state.sceneSkinIndex % 3) * 7, done: false }
  ];
  if (layout.length > 4) {
    base.push({ id: `clue-${state.sceneSkinIndex}`, kind: "clue", label: "线索", x: 88, y: 64, done: false });
  }
  return base;
}

function createSceneHazards() {
  const baseY = 28 + (state.sceneSkinIndex % 3) * 8;
  return [
    {
      id: `patrol-a-${state.sceneSkinIndex}`,
      label: "巡逻扫描",
      x: 38,
      y: baseY + 18,
      axis: "x",
      min: 24,
      max: 78,
      speed: 0.18 + (state.sceneSkinIndex % 3) * 0.035,
      dir: 1,
      radius: 10
    },
    {
      id: `patrol-b-${state.sceneSkinIndex}`,
      label: "警戒灯",
      x: 70,
      y: 62,
      axis: "y",
      min: 34,
      max: 76,
      speed: 0.14 + (state.sceneSkinIndex % 2) * 0.04,
      dir: -1,
      radius: 9
    }
  ];
}

function renderSceneProps() {
  const container = $("sceneProps");
  container.innerHTML = "";
  state.sceneProps.forEach((prop) => {
    const el = document.createElement("span");
    el.className = `scene-prop ${prop.kind} ${prop.done ? "done" : ""}`;
    el.textContent = prop.label;
    place(el, prop);
    container.appendChild(el);
  });
  state.sceneHazards.forEach((hazard) => {
    const el = document.createElement("span");
    el.className = `scene-prop patrol ${Date.now() < (hazard.hitUntil || 0) ? "hit" : ""}`;
    el.textContent = hazard.label;
    place(el, hazard);
    container.appendChild(el);
  });
}

function distanceTo(object) {
  return Math.hypot(state.playerX - object.x, state.playerY - object.y);
}

function approachPointFor(object) {
  const dx = state.playerX - object.x;
  const dy = state.playerY - object.y;
  const length = Math.hypot(dx, dy) || 1;
  const stopDistance = object.role === "final" ? 10 : 8;
  return {
    x: object.x + (dx / length) * stopDistance,
    y: object.y + (dy / length) * stopDistance
  };
}

function isObjectLocked(object) {
  return object.role === "final" && state.taskDone < state.taskGoal;
}

function intelText() {
  return `${Math.min(state.taskDone, state.taskGoal)}/${state.taskGoal}`;
}

function isObjectVisible(object) {
  if (object.role === "final") return true;
  if (object.role === "side") return state.missionStep >= 2 || object.done;
  return object.done || (object.phase || 1) <= state.missionStep;
}

function isObjectActive(object) {
  if (object.done) return false;
  if (object.role === "final") return !isObjectLocked(object);
  if (object.role === "side") return state.missionStep >= 2;
  return (object.phase || 1) === state.missionStep;
}

function activeMissionObjects() {
  return state.sceneObjects.filter((object) => isObjectVisible(object) && isObjectActive(object));
}

function missionInstruction() {
  const plan = state.taskPlan;
  if (!plan) return "移动角色，执行当前任务";
  if (state.taskDone >= state.taskGoal) return `最终目标：避开巡逻，接近${plan.finalLabel}完成突围`;
  if (state.missionStep <= 1) {
    const first = state.sceneObjects.find((item) => item.phase === 1 && !item.done);
    return first ? `第一步：躲开扫描，先${first.action}${first.label}` : `第一步：获取${plan.goalLabel}`;
  }
  return `第二步：自己选路线，真线索稳，捷径快但警戒高`;
}

function setSceneTarget(x, y) {
  state.targetX = Math.max(6, Math.min(94, x));
  state.targetY = Math.max(10, Math.min(84, y));
}

function scenePointFromEvent(event) {
  const rect = $("exploreScene").getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: 100 - ((event.clientY - rect.top) / rect.height) * 100
  };
}

function interactObject(id) {
  if (!state.running || state.paused) return;
  const object = state.sceneObjects.find((item) => item.id === id);
  if (!object || object.done) return;
  if (!isObjectVisible(object)) return;
  if (!isObjectActive(object)) {
    state.battleLog = object.role === "final" ? `先完成前置情报，再处理${object.label}` : missionInstruction();
    renderBattle();
    return;
  }
  if (distanceTo(object) > objectInteractRadius) {
    const point = approachPointFor(object);
    setSceneTarget(point.x, point.y);
    state.currentObjectId = id;
    state.battleLog = `前往${object.label}`;
    renderBattle();
    return;
  }
  if (object.role === "intel" || object.role === "decoy" || object.role === "shortcut") {
    completeIntelObject(object);
    return;
  }
  if (object.role === "side") {
    completeSideObject(object);
    return;
  }
  if (isObjectLocked(object)) {
    state.battleLog = `${object.label}暂未开放：有效情报 ${intelText()}`;
    state.autoInteractDelayUntil = Date.now() + 900;
    renderBattle();
    return;
  }
  state.currentObjectId = id;
  state.challengeType = object.type;
  state.battleLog = `${object.label}已启动，完成本幕单词验证`;
  openGate(object.word, object.type);
}

function completeIntelObject(object) {
  const beforeIntel = state.taskDone;
  object.done = true;
  if (object.role === "intel") {
    state.taskDone += object.value || 1;
    state.score += 32;
    state.stars += 1;
    state.battleLog = `${object.label}确认：${object.reward}，情报 ${intelText()}`;
  }
  if (object.role === "decoy") {
    state.seconds = Math.max(8, state.seconds - 6);
    state.score = Math.max(0, state.score - 8);
    state.streak = 0;
    state.battleLog = `${object.label}是干扰项，时间 -6s`;
    $("gameStage").classList.add("shake");
    window.setTimeout(() => $("gameStage").classList.remove("shake"), 340);
  }
  if (object.role === "shortcut") {
    state.taskDone += object.value || 1;
    state.alertLevel += 1;
    state.score += 42;
    state.seconds += 3;
    state.battleLog = `${object.label}成功：情报 ${intelText()}，警戒 ${state.alertLevel}`;
    if (state.alertLevel >= 2) {
      state.hearts -= 1;
      state.battleLog += "，被巡逻锁定，体力 -1";
    }
  }
  state.autoInteractDelayUntil = Date.now() + 520;
  if (beforeIntel < state.taskGoal && state.taskDone >= state.taskGoal) {
    state.missionStep = 3;
    state.seconds += 4;
    state.score += 18;
    state.battleLog = state.taskPlan?.success || "目标集齐，关键节点已开放";
  } else if (object.phase === state.missionStep && state.taskDone < state.taskGoal) {
    state.missionStep = Math.max(state.missionStep, 2);
  }
  save();
  renderHud();
  renderBattle();
  if (state.hearts <= 0) showEnergyPanel();
}

function completeSideObject(object) {
  object.done = true;
  state.score += 14;
  state.seconds += 4;
  if (state.hearts > 0 && state.hearts < 3) state.hearts += 1;
  state.autoInteractDelayUntil = Date.now() + 620;
  state.battleLog = "补给箱开启，获得时间补给";
  save();
  renderHud();
  renderBattle();
}

function interactNearestObject() {
  const candidate = state.sceneObjects
    .filter((item) => !item.done)
    .sort((a, b) => distanceTo(a) - distanceTo(b))[0];
  if (candidate && distanceTo(candidate) < 16) interactObject(candidate.id);
}

function completeSceneObject() {
  const object = state.sceneObjects.find((item) => item.id === state.currentObjectId);
  if (!object) return;
  object.done = true;
  state.battleLog = `${object.label}完成，任务链推进`;
}

function refreshSceneIfNeeded() {
  const finalObject = state.sceneObjects.find((item) => item.role === "final");
  if (!finalObject?.done) return;
  state.sceneSkinIndex += 1;
  state.sceneIndex = state.sceneSkinIndex % unlockedSceneCount();
  state.playerX = 14;
  state.playerY = 22;
  state.targetX = null;
  state.targetY = null;
  state.nearObjectId = null;
  state.nearObjectSince = 0;
  state.missionStep = 1;
  state.sceneHazards = [];
  state.hazardCooldown = 0;
  prepareSceneObjects();
  state.battleLog = "进入新区域，避开巡逻扫描";
}

function save() {
  localStorage.setItem(storeKey, JSON.stringify(state.progress));
  $("knownCount").textContent = state.mode === "unit" ? unitMasteredCount() : Object.keys(state.progress.known).length;
  $("missCount").textContent = Object.keys(state.progress.missed).length;
  $("bestScore").textContent = state.progress.best || 0;
  $("starCount").textContent = `${state.stars}/${state.progress.coins || 0}`;
  $("heartCount").textContent = state.hearts;
  renderEnergyState();
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function compactMeaning(meaning) {
  return meaning.split(/[；;]/).map((part) => part.replace(/\s+/g, "").trim()).filter(Boolean)[0]?.slice(0, 18) || meaning.slice(0, 18);
}

function pool() {
  if (state.mode === "all") return window.WORDS;
  if (state.mode !== "review") return activeUnitWords();
  const missed = new Set(Object.keys(state.progress.missed));
  const review = window.WORDS.filter((item) => missed.has(item.word));
  return review.length ? review : window.WORDS;
}

function pickWord() {
  const unit = activeUnit();
  if (state.mode === "unit" && unit?.words?.length) {
    const focus = activeUnitWords(unit);
    const unitKnown = unitKnownMap(unit);
    const unmastered = focus.filter((item) => (unitKnown[item.word] || 0) === 0);
    const candidates = unmastered.length ? unmastered : focus;
    const weighted = focus.flatMap((item) => {
      const known = unitKnown[item.word] || 0;
      const missed = state.progress.missed[item.word] || 0;
      return Array(Math.max(1, 8 + missed * 3 - known * 2)).fill(item);
    });
    if (unmastered.length) return candidates[Math.floor(Math.random() * candidates.length)];
    return weighted[Math.floor(Math.random() * weighted.length)];
  }
  if (state.mode === "all" && state.worldMission?.type === "group") {
    const missionWords = window.WORDS.filter((item) => item.group === state.worldMission.group);
    if (missionWords.length && Math.random() < 0.72) {
      return missionWords[Math.floor(Math.random() * missionWords.length)];
    }
  }
  const candidates = pool();
  const weighted = candidates.flatMap((item) => Array(Math.max(1, 5 + (state.progress.missed[item.word] || 0) - (state.progress.known[item.word] || 0))).fill(item));
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function coreSpeechText(word) {
  const text = word.replace(/\(.+?\)/g, "").replace(/\s+\/\s+.+$/, "").trim();
  return { AI: "A I", UN: "U N", UNESCO: "U N E S C O", WHO: "W H O", WTO: "W T O", CPC: "C P C", PLA: "P L A", PRC: "P R C", "p.m.": "P M", "a.m.": "A M", Mr: "mister", Mrs: "misses", Ms: "miz" }[text] || text;
}

function refreshVoices() {
  if ("speechSynthesis" in window) state.voices = speechSynthesis.getVoices();
}

function englishVoice() {
  refreshVoices();
  const voices = state.voices.filter((voice) => /^en[-_]/i.test(voice.lang));
  return voices.find((voice) => /Samantha|Alex|Daniel|Google US English|Microsoft Jenny|English/i.test(voice.name)) || voices.find((voice) => voice.localService) || voices[0] || null;
}

function speak(text = state.current?.word) {
  if (!text || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(coreSpeechText(text));
  const voice = englishVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "en-US";
  utterance.rate = 0.72;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function scene() {
  const unit = activeUnit();
  if (state.mode === "unit" && unit) return scenes.find((item) => item.key === unit.scene) || scenes[0];
  return scenes[state.sceneIndex % unlockedSceneCount()];
}

function place(el, point) {
  el.style.left = `${point.x}%`;
  el.style.bottom = `${point.y}%`;
}

function renderUnits() {
  const row = $("unitRow");
  if (!row || !allUnits.length) return;
  state.unitIndex = clampUnitIndex(state.unitIndex);
  row.innerHTML = "";
  const maxUnlocked = maxUnlockedUnitIndex();
  allUnits.forEach((unit, index) => {
    const locked = index > maxUnlocked;
    const cleared = isUnitCleared(unit);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `unit-chip ${index === state.unitIndex ? "active" : ""} ${locked ? "locked" : ""} ${cleared ? "cleared" : ""}`;
    button.disabled = locked;
    button.textContent = `${locked ? "锁定" : cleared ? "已过" : "挑战"} ${unit.name}`;
    button.title = locked ? "先通关前一个单元" : unit.title;
    button.addEventListener("click", () => {
      if (locked) return;
      state.unitIndex = index;
      localStorage.setItem("wordQuestActiveUnit", String(index));
      start("unit");
    });
    row.appendChild(button);
  });
}

function completeUnit() {
  const unit = activeUnit();
  const total = unit?.words?.length || 0;
  if (state.mode !== "unit" || !unit || unitMasteredCount(unit) < total) return;
  state.score += 80;
  state.stars += 5;
  state.progress.units = state.progress.units || {};
  state.progress.units[unit.id] = {
    bestScore: Math.max(state.progress.units[unit.id]?.bestScore || 0, state.score),
    clearedAt: new Date().toISOString()
  };
  state.unitIndex = clampUnitIndex(Math.min(allUnits.length - 1, state.unitIndex + 1));
  localStorage.setItem("wordQuestActiveUnit", String(state.unitIndex));
  save();
  renderUnits();
  state.sceneSkinIndex = state.unitIndex;
  state.playerX = 16;
  state.playerY = 22;
  state.targetX = null;
  state.targetY = null;
  prepareSceneObjects();
  renderBattle();
}

function renderHud() {
  const currentScene = scene();
  const unit = activeUnit();
  const unitTotal = unit?.words?.length || 0;
  const unitMastered = unitMasteredCount(unit);
  const mission = state.worldMission;
  $("gameStage").className = `game-stage scene-${currentScene.key} ${state.running ? "scene-active" : "scene-idle"}`;
  $("levelLabel").textContent = state.mode === "unit" && unit ? `${unit.name} · 已掌握 ${unitMastered}/${unitTotal}` : state.mode === "all" && mission ? `委托 ${state.worldMissionDone}/${mission.goal}` : `错题清除`;
  $("progress").value = state.mode === "unit" && unitTotal ? Math.min(100, (unitMastered / unitTotal) * 100) : state.mode === "all" && mission ? Math.min(100, (state.worldMissionDone / mission.goal) * 100) : 0;
  $("score").textContent = state.score;
  $("streak").textContent = state.streak;
  $("timer").textContent = state.seconds + "s";
  if (state.running && state.taskPlan && $("battleLog")) {
    const finalReady = state.taskDone >= state.taskGoal;
    const text = finalReady
      ? `${state.taskPlan.finalLabel}已开放，前往完成单词验证`
      : `${state.taskPlan.goalLabel} ${intelText()} · 警戒 ${state.alertLevel}`;
    if (!state.paused && !state.battleLog) $("battleLog").textContent = text;
  }
  $("starCount").textContent = `${state.stars}/${state.progress.coins || 0}`;
  $("heartCount").textContent = state.hearts;
  renderEnergyState();
  document.querySelectorAll(".unit-chip").forEach((button, index) => button.classList.toggle("active", state.mode === "unit" && index === state.unitIndex));
}

function renderEnergyState() {
  const low = state.hearts === 1;
  const empty = state.hearts <= 0;
  $("energyBadge").textContent = `体力 ${Math.max(0, state.hearts)}`;
  $("energyBadge").classList.toggle("low", low);
  $("energyBadge").classList.toggle("empty", empty);
  $("heartTile").classList.toggle("low-energy", low);
  $("heartTile").classList.toggle("empty-energy", empty);
}

function completeWorldMission() {
  const mission = state.worldMission;
  if (state.mode !== "all" || !mission || state.worldMissionDone < mission.goal) return;
  state.score += 120;
  state.stars += 8;
  state.progress.coins = (state.progress.coins || 0) + 30 + equipmentLevel() * 5;
  state.progress.worldMissions = (state.progress.worldMissions || 0) + 1;
  state.worldMission = createWorldMission();
  state.worldMissionDone = 0;
  save();
  renderHud();
}

function gameLoop() {
  if (!state.running || state.paused) return;
  updateSceneMovement();
  renderHud();
  renderBattle();
}

function updateSceneMovement() {
  let dx = 0;
  let dy = 0;
  const speedBoost = Date.now() < state.dashUntil ? 1.75 : 1;
  if (state.joystickActive) {
    dx += state.joystickX;
    dy += state.joystickY;
  }
  if (state.keys.has("ArrowRight") || state.keys.has("KeyD")) dx += 1;
  if (state.keys.has("ArrowLeft") || state.keys.has("KeyA")) dx -= 1;
  if (state.keys.has("ArrowUp") || state.keys.has("KeyW")) dy += 1;
  if (state.keys.has("ArrowDown") || state.keys.has("KeyS")) dy -= 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy) || 1;
    state.playerX = Math.max(6, Math.min(94, state.playerX + (dx / length) * 0.62 * speedBoost));
    state.playerY = Math.max(10, Math.min(84, state.playerY + (dy / length) * 0.62 * speedBoost));
    state.targetX = null;
    state.targetY = null;
    $("scenePlayer")?.classList.add("walking");
  } else if (state.targetX !== null && state.targetY !== null) {
    const tx = state.targetX - state.playerX;
    const ty = state.targetY - state.playerY;
    const length = Math.hypot(tx, ty);
    if (length < 0.8) {
      state.playerX = state.targetX;
      state.playerY = state.targetY;
      state.targetX = null;
      state.targetY = null;
      $("scenePlayer")?.classList.remove("walking");
      if (state.currentObjectId) interactObject(state.currentObjectId);
    } else {
      state.playerX += (tx / length) * 0.72 * speedBoost;
      state.playerY += (ty / length) * 0.72 * speedBoost;
      $("scenePlayer")?.classList.add("walking");
    }
  } else {
    $("scenePlayer")?.classList.remove("walking");
  }
  state.distance += (dx || dy || state.targetX !== null) ? 0.22 : 0;
  checkSceneProps();
  updateSceneHazards();
  checkAutoInteract();
}

function updateSceneHazards() {
  const now = Date.now();
  state.sceneHazards.forEach((hazard) => {
    if (hazard.axis === "x") {
      hazard.x += hazard.speed * hazard.dir;
      if (hazard.x < hazard.min || hazard.x > hazard.max) {
        hazard.x = Math.max(hazard.min, Math.min(hazard.max, hazard.x));
        hazard.dir *= -1;
      }
    } else {
      hazard.y += hazard.speed * hazard.dir;
      if (hazard.y < hazard.min || hazard.y > hazard.max) {
        hazard.y = Math.max(hazard.min, Math.min(hazard.max, hazard.y));
        hazard.dir *= -1;
      }
    }
    const caught = Math.hypot(state.playerX - hazard.x, state.playerY - hazard.y) < hazard.radius;
    if (caught && now > state.hazardCooldown) {
      state.hazardCooldown = now + 1450;
      state.impactUntil = now + 720;
      hazard.hitUntil = now + 720;
      if (state.shields > 0) {
        state.shields -= 1;
        state.battleLog = `护盾抵消扫描，剩余 ${state.shields}`;
        if (navigator.vibrate) navigator.vibrate(45);
        $("gameStage").classList.add("hit-burst");
        window.setTimeout(() => $("gameStage").classList.remove("hit-burst"), 520);
        save();
        renderBattle();
        return;
      }
      state.alertLevel += 1;
      state.streak = 0;
      state.seconds = Math.max(8, state.seconds - 3);
      state.score = Math.max(0, state.score - 16);
      const severe = state.alertLevel % 3 === 0;
      if (severe) state.hearts -= 1;
      state.battleLog = severe ? "命中！警戒 +1 / 时间 -3s / 体力 -1" : "命中！警戒 +1 / 时间 -3s";
      if (navigator.vibrate) navigator.vibrate(severe ? [90, 40, 90] : 80);
      $("gameStage").classList.add("shake", "hit-burst");
      window.setTimeout(() => $("gameStage").classList.remove("shake", "hit-burst"), 720);
      save();
      renderBattle();
      if (state.hearts <= 0) showEnergyPanel();
    }
  });
}

function nearestIncompleteObject(maxDistance = objectInteractRadius) {
  return state.sceneObjects
    .filter((item) => !item.done && isObjectVisible(item) && isObjectActive(item))
    .map((item) => ({ item, distance: distanceTo(item) }))
    .filter(({ distance }) => distance < maxDistance)
    .sort((a, b) => a.distance - b.distance)[0]?.item || null;
}

function checkAutoInteract() {
  if (!state.running || state.paused || Date.now() < state.autoInteractDelayUntil) return;
  const object = nearestIncompleteObject();
  if (!object) {
    state.nearObjectId = null;
    state.nearObjectSince = 0;
    return;
  }
  if (state.nearObjectId !== object.id) {
    state.nearObjectId = object.id;
    state.nearObjectSince = Date.now();
    state.battleLog = object.role === "final" && isObjectLocked(object)
      ? `${object.label}暂未开放，先完成前置任务`
      : `接近${object.label}：${object.reward || object.action}`;
    return;
  }
  if (Date.now() - state.nearObjectSince > 360) {
    interactObject(object.id);
  }
}

function checkSceneProps() {
  const now = Date.now();
  state.sceneProps.forEach((prop) => {
    const close = Math.hypot(state.playerX - prop.x, state.playerY - prop.y);
    if (prop.kind === "bonus" && !prop.done && close < 9) {
      prop.done = true;
      state.stars += 2;
      state.score += 18;
      state.battleLog = "获得补给，星星 +2";
      save();
    }
    if (prop.kind === "clue" && !prop.done && close < 9) {
      prop.done = true;
      state.seconds += 8;
      state.score += 12;
      state.battleLog = "找到线索，时间 +8s";
    }
    if (prop.kind === "speed" && close < 10 && now > (prop.cooldownUntil || 0)) {
      prop.cooldownUntil = now + 3600;
      state.dashUntil = now + 1300;
      state.score += 10;
      state.battleLog = "踩到加速带，短时提速";
      $("scenePlayer")?.classList.add("boosting");
      window.setTimeout(() => $("scenePlayer")?.classList.remove("boosting"), 1300);
    }
    if (prop.kind === "gear" && !prop.done && close < 9) {
      prop.done = true;
      state.shields = Math.min(2, state.shields + 1);
      state.stars += 2;
      state.score += 24;
      state.battleLog = `获得护盾 x${state.shields}`;
      save();
    }
    if (prop.kind === "alert" && close < 12 && now > state.alertCooldown) {
      state.alertCooldown = now + 2600;
      state.streak = 0;
      state.score = Math.max(0, state.score - 12);
      state.battleLog = "触发警戒，连击中断";
      $("gameStage").classList.add("shake");
      window.setTimeout(() => $("gameStage").classList.remove("shake"), 340);
    }
  });
}

function openGate(word = pickWord(), forcedType = null) {
  if (!state.running || state.paused) return;
  state.paused = true;
  state.current = word;
  const unit = activeUnit();
  const remaining = state.mode === "unit" && unit ? (unit.words.length - unitMasteredCount(unit)) : 99;
  state.bossActive = state.mode === "unit" && remaining <= 3;
  state.challengeType = forcedType || challengeTypeFor(word);
  state.gateDeadline = state.bossActive ? Date.now() + 12000 : 0;
  window.clearInterval(state.gateTimerId);
  if (state.bossActive) state.gateTimerId = window.setInterval(updateGateTimer, 250);
  renderGate();
  $("wordGate").classList.toggle("boss", state.bossActive);
  $("wordGate").classList.add("show");
  renderHud();
  window.setTimeout(() => speak(), 240);
}

function makeChoices() {
  const choicePool = state.mode === "unit" ? activeUnitWords().filter((item) => item.word !== state.current.word) : window.WORDS.filter((item) => item.word !== state.current.word);
  return shuffle([state.current, ...shuffle(choicePool).slice(0, 2)]);
}

function renderGate() {
  const choices = makeChoices();
  const panel = $("wordGate").querySelector(".gate-panel");
  panel.classList.toggle("long-word", state.current.word.length > 12);
  $("wordText").textContent = state.current.word;
  $("starBadge").textContent = state.mode === "unit" && state.current.focus ? `${state.current.unitName} 重点` : state.current.band;
  $("choices").innerHTML = "";
  if (state.challengeType === "listen") {
    $("wordText").textContent = "Listen";
    $("hintText").textContent = state.bossActive ? `门禁连锁 ${state.bossChain}/3 · 听音辨词` : "听发音，选出听到的英文";
    choices.forEach((choice) => addChoiceButton(choice.word, choice.word === state.current.word));
    return;
  }
  if (state.challengeType === "spell") {
    $("wordText").textContent = state.current.word.replace(/[A-Za-z]/g, "_");
    $("hintText").textContent = state.bossActive ? `门禁连锁 ${state.bossChain}/3 · 拼写补全：${compactMeaning(state.current.meaning)}` : `拼出这个词：${compactMeaning(state.current.meaning)}`;
    const input = document.createElement("input");
    input.className = "spell-input";
    input.autocomplete = "off";
    input.placeholder = "输入英文";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gate-choice spell-submit";
    button.textContent = "确认";
    button.addEventListener("click", () => answerGate(button, normalizeWord(input.value) === normalizeWord(state.current.word)));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") answerGate(button, normalizeWord(input.value) === normalizeWord(state.current.word));
    });
    $("choices").append(input, button);
    window.setTimeout(() => input.focus(), 80);
    return;
  }
  $("hintText").textContent = state.bossActive ? `连续破解 ${state.bossChain}/3 · 选择中文意思` : "这个目标信号是什么意思？";
  choices.forEach((choice) => addChoiceButton(compactMeaning(choice.meaning), choice.word === state.current.word));
}

function addChoiceButton(text, correct) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gate-choice";
  button.textContent = text;
  button.addEventListener("click", () => answerGate(button, correct));
  $("choices").appendChild(button);
}

function updateGateTimer() {
  if (!state.bossActive || !state.paused) return;
  const left = Math.max(0, Math.ceil((state.gateDeadline - Date.now()) / 1000));
  $("starBadge").textContent = `连锁 ${left}s`;
  if (left <= 0) answerGate($("choices").querySelector("button") || $("speakBtn"), false);
}

function answerGate(button, correct) {
  window.clearInterval(state.gateTimerId);
  document.querySelectorAll(".gate-choice").forEach((item) => {
    item.disabled = true;
    if (item.textContent === compactMeaning(state.current.meaning)) item.classList.add("correct");
  });
  if (correct) {
    button.classList.add("picked");
    state.streak += 1;
    state.score += 42 + Math.min(36, state.streak * 6);
    state.stars += 3;
    if (state.mode === "all" && state.worldMission?.type === "group" && state.current.group === state.worldMission.group) {
      state.worldMissionDone += 1;
    }
    if (state.mode === "unit" && state.current?.focus) {
      const known = unitKnownMap(activeUnit());
      known[state.current.word] = (known[state.current.word] || 0) + 1;
    } else {
      state.progress.known[state.current.word] = (state.progress.known[state.current.word] || 0) + 1;
      if (state.progress.known[state.current.word] >= 2) delete state.progress.missed[state.current.word];
    }
    state.bossChain = state.bossActive ? state.bossChain + 1 : 0;
    if (!state.bossActive || state.bossChain >= 3) completeSceneObject();
    state.battleLog = state.bossActive && state.bossChain < 3 ? `连续破解 ${state.bossChain}/3` : "目标完成，路线已更新";
    $("hintText").textContent = state.bossActive ? `连续破解 ${state.bossChain}/3` : "识别成功，目标已完成";
  } else {
    button.classList.add("wrong");
    state.hearts -= 1;
    state.streak = 0;
    state.bossChain = 0;
    state.progress.missed[state.current.word] = (state.progress.missed[state.current.word] || 0) + 1;
    state.battleLog = "信号识别失败，体力 -1";
    $("hintText").textContent = `答案：${compactMeaning(state.current.meaning)}`;
  }
  save();
  renderHud();
  renderBattle();
  window.setTimeout(() => {
    if (correct && state.bossActive && state.bossChain < 3 && state.hearts > 0) {
      state.current = pickWord();
      state.challengeType = challengeTypeFor(state.current);
      state.gateDeadline = Date.now() + 12000;
      state.gateTimerId = window.setInterval(updateGateTimer, 250);
      renderGate();
      speak();
      renderHud();
      return;
    }
    $("wordGate").classList.remove("show");
    $("wordGate").classList.remove("boss");
    state.paused = false;
    state.currentObjectId = null;
    state.nearObjectId = null;
    state.nearObjectSince = 0;
    state.autoInteractDelayUntil = Date.now() + 900;
    state.bossActive = false;
    state.bossChain = 0;
    completeUnit();
    completeWorldMission();
    refreshSceneIfNeeded();
    if (state.hearts <= 0) showEnergyPanel();
  }, correct ? 850 : 1500);
}

function showEnergyPanel() {
  state.running = false;
  state.paused = true;
  state.outOfEnergy = true;
  state.hearts = 0;
  state.streak = 0;
  window.clearInterval(state.loopId);
  window.clearInterval(state.timerId);
  window.clearInterval(state.gateTimerId);
  state.progress.best = Math.max(state.progress.best || 0, state.score);
  save();
  state.battleLog = "体力耗尽，任务暂停。补给后可以继续。";
  $("energyText").textContent = state.revives ? "再次补给会扣更多分，但可以继续完成本关。" : "使用补给恢复体力，继续完成本关。";
  $("energyPanel").classList.add("show");
  renderHud();
  renderBattle();
}

function reviveGame() {
  if (!state.outOfEnergy) return;
  const starCost = Math.min(state.stars, 6 + state.revives * 2);
  state.stars -= starCost;
  state.score = Math.max(0, state.score - state.revives * 40);
  state.hearts = 2;
  state.seconds = Math.max(state.seconds, 45);
  state.revives += 1;
  state.running = true;
  state.paused = false;
  state.outOfEnergy = false;
  state.battleLog = starCost ? `补给成功，消耗 ${starCost} 星` : "紧急补给成功，继续任务";
  $("energyPanel").classList.remove("show");
  window.clearInterval(state.loopId);
  window.clearInterval(state.timerId);
  state.loopId = window.setInterval(gameLoop, 33);
  state.timerId = window.setInterval(tick, 1000);
  save();
  renderHud();
  renderBattle();
}

function activateDash() {
  const now = Date.now();
  if (!state.running || state.paused || now < state.dashCooldownUntil) return;
  state.dashUntil = now + 760;
  state.dashCooldownUntil = now + 4200;
  state.score += 6;
  state.battleLog = "冲刺启动，快速穿过危险区";
  $("scenePlayer")?.classList.add("boosting");
  $("skillBtn")?.classList.add("cooling");
  window.setTimeout(() => $("scenePlayer")?.classList.remove("boosting"), 760);
  window.setTimeout(() => $("skillBtn")?.classList.remove("cooling"), 4200);
  renderHud();
}

function tick() {
  if (!state.running || state.paused) return;
  state.seconds -= 1;
  renderHud();
  if (state.seconds <= 0) stopGame();
}

function start(mode = "unit") {
  const reviewOnly = mode === "review";
  if (mode === "unit") state.unitIndex = clampUnitIndex(state.unitIndex);
  state.running = true;
  state.paused = false;
  state.mode = mode;
  state.score = 0;
  state.streak = 0;
  state.seconds = reviewOnly ? 100 : mode === "all" ? 180 : 150;
  state.stars = 0;
  state.hearts = 3;
  state.shields = 0;
  state.revives = 0;
  state.outOfEnergy = false;
  state.battleLog = "拖动移动，避开巡逻扫描";
  state.playerX = 16;
  state.playerY = 22;
  state.targetX = null;
  state.targetY = null;
  state.sceneSkinIndex = mode === "unit" ? state.unitIndex : 0;
  state.sceneObjects = [];
  state.sceneProps = [];
  state.sceneHazards = [];
  state.sceneMission = null;
  state.taskPlan = null;
  state.taskGoal = 0;
  state.taskDone = 0;
  state.missionStep = 1;
  state.currentObjectId = null;
  state.nearObjectId = null;
  state.nearObjectSince = 0;
  state.autoInteractDelayUntil = 0;
  state.touchMoving = false;
  resetJoystick();
  state.alertCooldown = 0;
  state.alertLevel = 0;
  state.hazardCooldown = 0;
  state.dashUntil = 0;
  state.dashCooldownUntil = 0;
  state.distance = 0;
  state.sceneIndex = mode === "unit" ? state.unitIndex : 0;
  state.worldMission = mode === "all" ? createWorldMission() : null;
  state.worldMissionDone = 0;
  state.bossActive = false;
  state.bossChain = 0;
  window.clearInterval(state.gateTimerId);
  $("gameStage").classList.remove("home-open");
  $("modeHome").classList.add("hidden");
  $("wordGate").classList.remove("show");
  $("energyPanel").classList.remove("show");
  $("startBtn").textContent = mode === "unit" ? "重开本关" : "返回大厅";
  window.clearInterval(state.loopId);
  window.clearInterval(state.timerId);
  window.clearInterval(state.gateTimerId);
  state.loopId = window.setInterval(gameLoop, 33);
  state.timerId = window.setInterval(tick, 1000);
  renderHud();
  renderBattle();
}

function stopGame() {
  state.running = false;
  state.paused = false;
  state.outOfEnergy = false;
  window.clearInterval(state.loopId);
  window.clearInterval(state.timerId);
  window.clearInterval(state.gateTimerId);
  state.progress.best = Math.max(state.progress.best || 0, state.score);
  state.progress.stars = Math.max(state.progress.stars || 0, state.stars);
  save();
  state.battleLog = `探索 ${Math.floor(state.distance)}m，得分 ${state.score}`;
  renderBattle();
  $("startBtn").textContent = state.mode === "unit" ? "重开本关" : "返回大厅";
}

function showHome() {
  state.running = false;
  state.paused = false;
  state.outOfEnergy = false;
  window.clearInterval(state.loopId);
  window.clearInterval(state.timerId);
  window.clearInterval(state.gateTimerId);
  $("wordGate").classList.remove("show");
  $("wordGate").classList.remove("boss");
  $("energyPanel").classList.remove("show");
  $("modeHome").classList.remove("hidden");
  $("gameStage").classList.add("home-open");
  $("levelLabel").textContent = "准备出发";
  $("timer").textContent = "--";
  $("progress").value = 0;
  $("startBtn").textContent = "单元闯关";
}

function showCards() {
  const list = $("cardList");
  const known = new Set(Object.keys(state.progress.known));
  const missed = new Set(Object.keys(state.progress.missed));
  const cards = window.WORDS.filter((item) => known.has(item.word) || missed.has(item.word));
  list.innerHTML = cards.length ? "" : "<p>还没有词卡，先探索一局。</p>";
  cards.slice(0, 120).forEach((item) => {
    const card = document.createElement("div");
    card.className = "mini-card";
    card.innerHTML = `<strong>${item.word}</strong><span>${compactMeaning(item.meaning)}</span><small>${missed.has(item.word) ? "错题" : "已掌握"}</small>`;
    list.appendChild(card);
  });
  $("cardsDialog").showModal();
}

$("campaignModeBtn").addEventListener("click", () => start("unit"));
$("worldModeBtn").addEventListener("click", () => start("all"));
$("reviewModeBtn").addEventListener("click", () => start("review"));
$("startBtn").addEventListener("click", () => state.mode === "unit" ? start("unit") : showHome());
$("allModeBtn").addEventListener("click", () => start("all"));
$("reviewBtn").addEventListener("click", () => start("review"));
$("cardBtn").addEventListener("click", showCards);
$("closeCards").addEventListener("click", () => $("cardsDialog").close());
$("speakBtn").addEventListener("click", () => speak());
$("skillBtn").addEventListener("click", activateDash);
$("reviveBtn").addEventListener("click", reviveGame);
$("energyRestartBtn").addEventListener("click", () => start(state.mode === "all" ? "all" : "unit"));
$("energyReviewBtn").addEventListener("click", () => start("review"));
const exploreScene = $("exploreScene");
const mobileJoystick = $("mobileJoystick");
const joystickKnob = $("joystickKnob");

function updateJoystick(event) {
  const rect = mobileJoystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const max = rect.width * 0.34;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const distance = Math.hypot(rawX, rawY);
  const limited = Math.min(max, distance || 0);
  const nx = distance ? rawX / distance : 0;
  const ny = distance ? rawY / distance : 0;
  const knobX = nx * limited;
  const knobY = ny * limited;
  state.joystickX = knobX / max;
  state.joystickY = -knobY / max;
  state.joystickActive = true;
  state.targetX = null;
  state.targetY = null;
  joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
}

function resetJoystick() {
  state.joystickActive = false;
  state.joystickX = 0;
  state.joystickY = 0;
  joystickKnob?.style.setProperty("transform", "translate(-50%, -50%)");
}

mobileJoystick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  mobileJoystick.setPointerCapture?.(event.pointerId);
  updateJoystick(event);
});
mobileJoystick.addEventListener("pointermove", (event) => {
  if (!state.joystickActive) return;
  event.preventDefault();
  updateJoystick(event);
});
mobileJoystick.addEventListener("pointerup", (event) => {
  mobileJoystick.releasePointerCapture?.(event.pointerId);
  resetJoystick();
});
mobileJoystick.addEventListener("pointercancel", resetJoystick);

function moveTowardEvent(event) {
  const point = scenePointFromEvent(event);
  setSceneTarget(point.x, point.y);
  state.currentObjectId = null;
  state.nearObjectId = null;
  state.nearObjectSince = 0;
  state.battleLog = "正在移动，注意巡逻扫描";
}

exploreScene.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".scene-object")) return;
  state.touchMoving = true;
  exploreScene.setPointerCapture?.(event.pointerId);
  moveTowardEvent(event);
});
exploreScene.addEventListener("pointermove", (event) => {
  if (!state.touchMoving || event.target.closest(".scene-object")) return;
  moveTowardEvent(event);
});
exploreScene.addEventListener("pointerup", (event) => {
  state.touchMoving = false;
  exploreScene.releasePointerCapture?.(event.pointerId);
});
exploreScene.addEventListener("pointercancel", () => {
  state.touchMoving = false;
});
window.addEventListener("keydown", (event) => {
  state.keys.add(event.code);
  if (event.code === "Space" && !event.repeat) activateDash();
  if ((event.code === "KeyE" || event.code === "Enter") && !event.repeat) interactNearestObject();
});
window.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

if ("speechSynthesis" in window) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

save();
state.unitIndex = clampUnitIndex(state.unitIndex);
localStorage.setItem("wordQuestActiveUnit", String(state.unitIndex));
renderUnits();
showHome();
