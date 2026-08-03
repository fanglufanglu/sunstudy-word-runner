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
const sceneObjectTemplates = [
  { id: "terminal", label: "终端机", action: "破解", x: 72, y: 72, type: "spell" },
  { id: "locker", label: "储物柜", action: "搜索", x: 22, y: 68, type: "meaning" },
  { id: "gate", label: "门禁", action: "解锁", x: 84, y: 30, type: "listen" },
  { id: "signal", label: "信号箱", action: "校准", x: 43, y: 42, type: "meaning" }
];
const sceneSkins = ["campus", "metro", "roof", "market", "library", "station"];

const state = {
  running: false,
  paused: false,
  mode: "unit",
  score: 0,
  streak: 0,
  seconds: 150,
  stars: 0,
  hearts: 3,
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
  currentObjectId: null,
  sceneSkinIndex: 0,
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
  arena.className = `explore-scene skin-${sceneSkins[state.sceneSkinIndex % sceneSkins.length]}`;
  $("battleZone").textContent = state.mode === "unit" && unit ? `${unit.name} · ${unit.title}` : state.mode === "all" ? `城市大世界 Lv.${equipmentLevel()}` : "错题训练场";
  $("battleLog").textContent = state.battleLog || "点击地面移动，靠近发光目标后调查";
  place($("scenePlayer"), { x: state.playerX, y: state.playerY });
  sceneObjectTemplates.forEach((template) => {
    const object = state.sceneObjects.find((item) => item.id === template.id);
    const button = document.querySelector(`.scene-object[data-object="${template.id}"]`);
    if (!object || !button) return;
    const near = distanceTo(object) < 13;
    place(button, object);
    button.classList.toggle("near", near && !object.done);
    button.classList.toggle("done", object.done);
    button.disabled = object.done;
    button.querySelector("strong").textContent = object.label;
    button.querySelector("span").textContent = object.done ? "完成" : object.action;
    button.title = object.done ? "已完成" : near ? `调查：${object.word.word}` : "靠近后调查";
  });
}

function prepareSceneObjects() {
  state.sceneObjects = sceneObjectTemplates.map((template, index) => ({
    ...template,
    word: pickWord(),
    done: false,
    x: Math.max(12, Math.min(88, template.x + Math.sin((state.sceneSkinIndex + 1) * (index + 1)) * 4)),
    y: Math.max(18, Math.min(78, template.y + Math.cos((state.sceneSkinIndex + 2) * (index + 1)) * 5))
  }));
  state.currentObjectId = null;
  state.battleLog = state.mode === "unit" ? "探索区域，逐个调查发光目标" : "接近目标，完成城市委托";
}

function distanceTo(object) {
  return Math.hypot(state.playerX - object.x, state.playerY - object.y);
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
  if (distanceTo(object) > 13) {
    setSceneTarget(object.x, Math.max(12, object.y - 5));
    state.currentObjectId = id;
    state.battleLog = `正在接近${object.label}`;
    renderBattle();
    return;
  }
  state.currentObjectId = id;
  state.challengeType = object.type;
  state.battleLog = `${object.label}启动，识别信号词`;
  openGate(object.word, object.type);
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
  state.battleLog = `${object.label}完成，继续调查下一个目标`;
}

function refreshSceneIfNeeded() {
  if (state.sceneObjects.some((item) => !item.done)) return;
  state.sceneSkinIndex += 1;
  state.sceneIndex = state.sceneSkinIndex % unlockedSceneCount();
  state.playerX = 14;
  state.playerY = 22;
  state.targetX = null;
  state.targetY = null;
  prepareSceneObjects();
  state.battleLog = "进入新的街区，寻找下一组目标";
}

function save() {
  localStorage.setItem(storeKey, JSON.stringify(state.progress));
  $("knownCount").textContent = state.mode === "unit" ? unitMasteredCount() : Object.keys(state.progress.known).length;
  $("missCount").textContent = Object.keys(state.progress.missed).length;
  $("bestScore").textContent = state.progress.best || 0;
  $("starCount").textContent = `${state.stars}/${state.progress.coins || 0}`;
  $("heartCount").textContent = state.hearts;
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
  $("starCount").textContent = `${state.stars}/${state.progress.coins || 0}`;
  $("heartCount").textContent = state.hearts;
  document.querySelectorAll(".unit-chip").forEach((button, index) => button.classList.toggle("active", state.mode === "unit" && index === state.unitIndex));
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
  if (state.keys.has("ArrowRight") || state.keys.has("KeyD")) dx += 1;
  if (state.keys.has("ArrowLeft") || state.keys.has("KeyA")) dx -= 1;
  if (state.keys.has("ArrowUp") || state.keys.has("KeyW")) dy += 1;
  if (state.keys.has("ArrowDown") || state.keys.has("KeyS")) dy -= 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy) || 1;
    state.playerX = Math.max(6, Math.min(94, state.playerX + (dx / length) * 0.62));
    state.playerY = Math.max(10, Math.min(84, state.playerY + (dy / length) * 0.62));
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
      state.playerX += (tx / length) * 0.72;
      state.playerY += (ty / length) * 0.72;
      $("scenePlayer")?.classList.add("walking");
    }
  } else {
    $("scenePlayer")?.classList.remove("walking");
  }
  state.distance += (dx || dy || state.targetX !== null) ? 0.22 : 0;
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
    state.bossActive = false;
    state.bossChain = 0;
    completeUnit();
    completeWorldMission();
    refreshSceneIfNeeded();
    if (state.hearts <= 0) stopGame();
  }, correct ? 850 : 1500);
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
  state.battleLog = "点击地面移动，调查发光目标";
  state.playerX = 16;
  state.playerY = 22;
  state.targetX = null;
  state.targetY = null;
  state.sceneSkinIndex = mode === "unit" ? state.unitIndex : 0;
  state.sceneObjects = [];
  state.currentObjectId = null;
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
  window.clearInterval(state.loopId);
  window.clearInterval(state.timerId);
  window.clearInterval(state.gateTimerId);
  $("wordGate").classList.remove("show");
  $("wordGate").classList.remove("boss");
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
const exploreScene = $("exploreScene");
exploreScene.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".scene-object")) return;
  const point = scenePointFromEvent(event);
  setSceneTarget(point.x, point.y);
  state.currentObjectId = null;
  state.battleLog = "正在移动，寻找可调查目标";
});
document.querySelectorAll(".scene-object").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    interactObject(button.dataset.object);
  });
});
window.addEventListener("keydown", (event) => {
  state.keys.add(event.code);
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
