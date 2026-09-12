(() => {
  "use strict";

  // ---------- DOM ----------
  const $ = id => document.getElementById(id);

  const video = $("video"), canvas = $("canvas"), ctx = canvas.getContext("2d");
  const empty = $("empty"), liveBadge = $("liveBadge"), stage = $("stage");
  const statusEl = $("status"), projectName = $("projectName");

  const videoFile = $("videoFile"), logoFile = $("logoFile"), bulletinName = $("bulletinName");
  const headline = $("headline"), presenter = $("presenter"), location_ = $("location"), script = $("script");
  const analyzeBtn = $("analyze"), aiReport = $("aiReport");
  const sceneList = $("sceneList");

  const playBtn = $("play"), pauseBtn = $("pause"), backBtn = $("back"), fwdBtn = $("forward"), fsBtn = $("fullscreen");
  const aiProduceBtn = $("aiProduce"), recordBtn = $("record");
  const currentEl = $("current"), durationEl = $("duration"), seek = $("seek");

  const tabs = document.querySelectorAll(".tab"), panels = document.querySelectorAll(".tabPanel");
  const dropzone = $("dropzone"), mediaInfo = $("mediaInfo");
  const videoClip = $("videoClip"), audioClip = $("audioClip");
  const presenterVol = $("presenterVol");
  const qcReport = $("qcReport");

  const lowerText = $("lowerText"), lowerTitle = $("lowerTitle"), screenHeadline = $("screenHeadline"), ticker = $("ticker");
  const theme = $("theme"), gfxOpacity = $("gfxOpacity"), logoOpacity = $("logoOpacity");
  const showLower = $("showLower"), showHeadline = $("showHeadline"), showTicker = $("showTicker"), showLogo = $("showLogo");

  const applyBtn = $("apply"), findShotsBtn = $("findShots"), runQcBtn = $("runQc"), saveBtn = $("save"), resetBtn = $("reset");
  const mediaStatus = $("mediaStatus"), gfxStatus = $("gfxStatus"), aiStatus = $("aiStatus"), qcStatus = $("qcStatus");

  // ---------- STATE ----------
  let logoImg = null;
  let tickerX = 0;
  let mediaLoaded = false;
  let lastAnalysis = null;
  let recorder = null, recChunks = [];
  let scenes = [];

  const THEMES = {
    classic: { bar: "rgba(5,11,22,0.78)", panel: "rgba(10,22,40,0.86)", text: "#ffffff", sub: "#c9d3e3", accent: "#d1a13f" },
    dark:    { bar: "rgba(0,0,0,0.75)",   panel: "rgba(18,18,22,0.85)", text: "#f5f5f5", sub: "#b7bdc8", accent: "#5ad1e6" },
    light:   { bar: "rgba(255,255,255,0.85)", panel: "rgba(255,255,255,0.9)", text: "#10151d", sub: "#3d4753", accent: "#c8102e" },
  };
  const CRIMSON = "#c8102e";

  function setStatus(text, mode) {
    statusEl.textContent = text;
    statusEl.className = "status" + (mode ? " " + mode : "");
  }

  // ---------- TABS ----------
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    panels.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    $("tab-" + t.dataset.tab).classList.add("active");
  }));

  // ---------- MEDIA IMPORT ----------
  function loadVideoFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.load();
    video.addEventListener("loadedmetadata", function onMeta() {
      video.removeEventListener("loadedmetadata", onMeta);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.classList.add("on");
      empty.style.display = "none";
      liveBadge.classList.add("on");
      mediaLoaded = true;

      seek.max = Math.floor(video.duration);
      durationEl.textContent = fmtTime(video.duration);
      videoClip.textContent = file.name + " — " + fmtTime(video.duration);

      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const aspect = (video.videoWidth / video.videoHeight).toFixed(2);
      mediaInfo.innerHTML = `
        <div class="card"><b>${video.videoWidth}&times;${video.videoHeight}</b>Resolution</div>
        <div class="card"><b>${fmtTime(video.duration)}</b>Duration</div>
        <div class="card"><b>${sizeMB} MB</b>File size</div>
        <div class="card"><b>${aspect}:1</b>Aspect ratio</div>
      `;
      mediaStatus.textContent = "Loaded";
      audioClip.textContent = hasAudioTrack() ? "Audio track detected" : "Presenter · Music · B-roll";
      setStatus("MEDIA LOADED");
      draw();
    }, { once: true });
  }

  function hasAudioTrack() {
    try {
      const s = video.captureStream ? video.captureStream() : video.mozCaptureStream();
      return s.getAudioTracks().length > 0;
    } catch (e) { return null; }
  }

  videoFile.addEventListener("change", e => loadVideoFile(e.target.files[0]));

  logoFile.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => { logoImg = img; };
    img.src = URL.createObjectURL(file);
  });

  ["dragover"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove("dragover"); }));
  dropzone.addEventListener("drop", e => {
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) loadVideoFile(f);
  });

  // ---------- TRANSPORT ----------
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  }
  video.addEventListener("timeupdate", () => {
    currentEl.textContent = fmtTime(video.currentTime);
    if (!seekDragging) seek.value = Math.floor(video.currentTime);
  });
  let seekDragging = false;
  seek.addEventListener("mousedown", () => seekDragging = true);
  seek.addEventListener("touchstart", () => seekDragging = true);
  seek.addEventListener("change", () => {
    video.currentTime = Number(seek.value);
    seekDragging = false;
  });

  playBtn.addEventListener("click", () => mediaLoaded && video.play());
  pauseBtn.addEventListener("click", () => mediaLoaded && video.pause());
  backBtn.addEventListener("click", () => mediaLoaded && (video.currentTime = Math.max(0, video.currentTime - 5)));
  fwdBtn.addEventListener("click", () => mediaLoaded && (video.currentTime = Math.min(video.duration, video.currentTime + 5)));
  fsBtn.addEventListener("click", () => {
    if (stage.requestFullscreen) stage.requestFullscreen();
  });
  presenterVol.addEventListener("input", () => { video.volume = Number(presenterVol.value); });

  // ---------- DRAW LOOP ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    if (mediaLoaded && video.readyState >= 2) {
      const W = canvas.width, H = canvas.height;
      const t = THEMES[theme.value] || THEMES.classic;
      const gfxA = Number(gfxOpacity.value);
      const logoA = Number(logoOpacity.value);

      ctx.drawImage(video, 0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = gfxA;

      // top bar
      ctx.fillStyle = t.bar;
      ctx.fillRect(0, 0, W, 54);

      if (showLogo.checked) {
        ctx.save();
        ctx.globalAlpha = gfxA * logoA;
        if (logoImg) {
          const lh = 34, lw = logoImg.width * (lh / logoImg.height);
          ctx.drawImage(logoImg, 18, 10, lw, lh);
        } else {
          ctx.fillStyle = CRIMSON;
          ctx.beginPath();
          ctx.moveTo(18, 12); ctx.lineTo(140, 12); ctx.lineTo(128, 42); ctx.lineTo(18, 42);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "700 17px Oswald, sans-serif";
          ctx.textBaseline = "middle";
          ctx.fillText((bulletinName.value || "NEWSROOM").toUpperCase(), 28, 27);
        }
        ctx.restore();
      }

      ctx.fillStyle = t.text;
      ctx.font = "500 15px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), W - 20, 27);
      ctx.textAlign = "left";

      // headline banner (upper third)
      if (showHeadline.checked && (screenHeadline.value || headline.value)) {
        const text = (screenHeadline.value || headline.value).toUpperCase();
        ctx.font = "700 22px Oswald, sans-serif";
        ctx.fillStyle = CRIMSON;
        ctx.fillRect(0, 64, W, 42);
        ctx.fillStyle = "#fff";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 22, 85, W - 44);
      }

      // lower third
      if (showLower.checked) {
        const lowerY = H - (showTicker.checked ? 96 : 40) - 90;
        ctx.fillStyle = t.accent;
        ctx.fillRect(0, lowerY, W * 0.55, 5);
        ctx.fillStyle = t.panel;
        ctx.fillRect(0, lowerY + 5, W * 0.55, 80);
        ctx.fillStyle = CRIMSON;
        ctx.fillRect(0, lowerY, 6, 85);

        ctx.fillStyle = t.text;
        ctx.font = "700 25px Oswald, sans-serif";
        ctx.fillText((lowerText.value || "").toUpperCase(), 26, lowerY + 34);
        ctx.fillStyle = t.sub;
        ctx.font = "500 15px Inter, sans-serif";
        ctx.fillText(lowerTitle.value || "", 26, lowerY + 62);
      }

      // ticker
      if (showTicker.checked) {
        const tH = 44;
        ctx.fillStyle = t.bar;
        ctx.fillRect(0, H - tH, W, tH);
        ctx.fillStyle = t.accent;
        ctx.fillRect(0, H - tH, 120, tH);
        ctx.fillStyle = theme.value === "light" ? "#10151d" : "#0a1628";
        ctx.font = "700 15px Oswald, sans-serif";
        ctx.fillText("LATEST", 18, H - tH / 2);

        ctx.save();
        ctx.beginPath();
        ctx.rect(120, H - tH, W - 120, tH);
        ctx.clip();
        ctx.fillStyle = t.text;
        ctx.font = "500 17px Inter, sans-serif";
        const txt = ticker.value || "";
        ctx.fillText(txt, tickerX, H - tH / 2);
        const tw = ctx.measureText(txt).width;
        tickerX -= 2;
        if (tickerX < -tw) tickerX = W;
        ctx.restore();
      }

      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // ---------- AI ANALYZE STORY ----------
  const STOPWORDS = new Set("a an the of to in on for with and or but is are was were be been being this that it its as at by from into over under after before during than then so if not no yes will would can could should may might we you they he she i our your their".split(" "));

  function analyzeStory() {
    const text = (headline.value + " " + script.value).trim();
    if (!text) {
      aiReport.textContent = "Add a headline or paste a script before analyzing.";
      return;
    }
    const words = text.toLowerCase().match(/[a-z']+/g) || [];
    const wordCount = words.length;
    const freq = {};
    words.forEach(w => { if (!STOPWORDS.has(w) && w.length > 3) freq[w] = (freq[w] || 0) + 1; });
    const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]);

    const readingSeconds = Math.round((wordCount / 150) * 60); // ~150 wpm broadcast pace
    const isBreaking = /\b(breaking|urgent|just in|developing)\b/i.test(text);

    lastAnalysis = { keywords, wordCount, readingSeconds, isBreaking };

    const suggestedTicker = (headline.value ? headline.value.toUpperCase() + " \u2022 " : "") +
      keywords.map(k => k.toUpperCase()).join(" \u2022 ");

    aiReport.innerHTML =
      `<b>${wordCount}</b> words &middot; est. <b>${fmtTime(readingSeconds)}</b> read at broadcast pace\n` +
      `Keywords: <b>${keywords.join(", ") || "none detected"}</b>\n` +
      (isBreaking ? `Flag: <b>breaking/urgent language detected</b>\n` : "") +
      `Suggested ticker copied below — click "Apply Broadcast Look" to push it live.`;

    if (!ticker.dataset.userEdited) ticker.value = suggestedTicker || ticker.value;
    aiStatus.textContent = "Analyzed";

    // fallback scene suggestions from script paragraphs, only if no video-based scenes exist yet
    if (!mediaLoaded && scenes.length === 0) {
      const paras = script.value.split(/\n+/).filter(p => p.trim().length > 0);
      if (paras.length) {
        scenes = paras.map((p, i) => ({ label: `Beat ${i + 1}`, note: p.slice(0, 60), t: null }));
        renderScenes();
      }
    }
  }
  analyzeBtn.addEventListener("click", analyzeStory);
  ticker.addEventListener("input", () => ticker.dataset.userEdited = "1");

  // ---------- FIND BEST SHOTS (real frame-diff scene detection) ----------
  function seekAndWait(t) {
    return new Promise(resolve => {
      const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
      video.addEventListener("seeked", onSeeked);
      video.currentTime = t;
    });
  }

  async function findBestShots() {
    if (!mediaLoaded) { aiReport.textContent = "Import a video first, then find best shots."; return; }
    setStatus("ANALYZING VIDEO", "busy");
    aiStatus.textContent = "Scanning\u2026";

    const wasPlaying = !video.paused;
    video.pause();

    const dur = video.duration;
    const sampleCount = Math.min(30, Math.max(8, Math.floor(dur / 2)));
    const step = dur / sampleCount;
    const aCanvas = document.createElement("canvas");
    aCanvas.width = 64; aCanvas.height = 36;
    const actx = aCanvas.getContext("2d");

    let prev = null;
    const diffs = [];
    for (let i = 0; i < sampleCount; i++) {
      const t = Math.min(dur - 0.05, i * step + step / 2);
      await seekAndWait(t);
      actx.drawImage(video, 0, 0, 64, 36);
      const data = actx.getImageData(0, 0, 64, 36).data;
      if (prev) {
        let sum = 0;
        for (let p = 0; p < data.length; p += 4) {
          sum += Math.abs(data[p] - prev[p]) + Math.abs(data[p + 1] - prev[p + 1]) + Math.abs(data[p + 2] - prev[p + 2]);
        }
        diffs.push({ t, score: sum });
      }
      prev = data;
    }

    diffs.sort((a, b) => b.score - a.score);
    const top = diffs.slice(0, Math.min(8, diffs.length)).sort((a, b) => a.t - b.t);
    scenes = top.map((d, i) => ({ label: `Shot ${i + 1}`, note: "Detected visual change", t: d.t }));
    renderScenes();

    if (wasPlaying) video.play();
    setStatus("MEDIA LOADED");
    aiStatus.textContent = "Shots detected";
  }
  findShotsBtn.addEventListener("click", findBestShots);

  function renderScenes() {
    if (!scenes.length) {
      sceneList.innerHTML = `<p class="hint">Run "Find Best Shots" after importing a video.</p>`;
      return;
    }
    sceneList.innerHTML = scenes.map((s, i) => `
      <div class="scene-chip" data-i="${i}">
        <span>${s.label}${s.note ? " — " + s.note : ""}</span>
        <b>${s.t != null ? fmtTime(s.t) : ""}</b>
      </div>`).join("");
    sceneList.querySelectorAll(".scene-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const s = scenes[Number(chip.dataset.i)];
        if (s.t != null && mediaLoaded) {
          document.querySelector('.tab[data-tab="media"]').click();
          video.currentTime = s.t;
        }
      });
    });
  }

  // ---------- APPLY BROADCAST LOOK ----------
  function applyBroadcastLook() {
    if (presenter.value) lowerText.value = presenter.value.toUpperCase();
    lowerTitle.value = location_.value ? "REPORTING \u2014 " + location_.value.toUpperCase() : "NEWS";
    if (headline.value) screenHeadline.value = headline.value;
    if (lastAnalysis && lastAnalysis.isBreaking) theme.value = "dark";
    showLower.checked = showHeadline.checked = showTicker.checked = showLogo.checked = true;
    gfxStatus.textContent = "Applied";
    setStatus("BROADCAST LOOK APPLIED");
  }
  applyBtn.addEventListener("click", applyBroadcastLook);

  // ---------- BROADCAST QC ----------
  function row(label, state, detail) {
    const cls = state === "pass" ? "pass" : state === "warn" ? "warn" : "fail";
    const word = state === "pass" ? "PASS" : state === "warn" ? "CHECK" : "FAIL";
    return `<div class="qc-row"><span>${label}${detail ? " \u2014 " + detail : ""}</span><span class="${cls}">${word}</span></div>`;
  }
  function runQc() {
    if (!mediaLoaded) { qcReport.textContent = "Import a video before running broadcast QC."; return; }
    const w = video.videoWidth, h = video.videoHeight, ar = w / h;
    const rows = [];
    rows.push(row("Resolution", w >= 1280 && h >= 720 ? "pass" : "warn", `${w}\u00d7${h}`));
    rows.push(row("Aspect ratio", Math.abs(ar - 16 / 9) < 0.05 ? "pass" : "warn", ar.toFixed(2) + ":1"));
    rows.push(row("Duration", video.duration >= 5 && video.duration <= 1200 ? "pass" : "warn", fmtTime(video.duration)));
    const audio = hasAudioTrack();
    rows.push(row("Audio track", audio === true ? "pass" : audio === false ? "fail" : "warn",
      audio === true ? "detected" : audio === false ? "no audio track found" : "could not verify in this browser"));
    rows.push(row("Ticker length", (ticker.value || "").length >= 12 ? "pass" : "warn", (ticker.value || "").length + " chars"));
    rows.push(row("Lower third text", lowerText.value ? "pass" : "warn", lowerText.value ? "set" : "empty"));
    qcReport.innerHTML = rows.join("");
    const anyFail = qcReport.querySelectorAll(".fail").length;
    const anyWarn = qcReport.querySelectorAll(".warn").length;
    qcStatus.textContent = anyFail ? "Issues found" : anyWarn ? "Warnings" : "Passed";
  }
  runQcBtn.addEventListener("click", runQc);

  // ---------- AI PRODUCE (full pipeline) ----------
  async function aiProduce() {
    setStatus("PRODUCING", "busy");
    if (!lastAnalysis) analyzeStory();
    applyBroadcastLook();
    if (mediaLoaded) {
      await findBestShots();
      runQc();
    }
    setStatus("PRODUCED");
  }
  aiProduceBtn.addEventListener("click", aiProduce);

  // ---------- SAVE PROJECT JSON ----------
  saveBtn.addEventListener("click", () => {
    const proj = {
      bulletinName: bulletinName.value,
      story: { headline: headline.value, presenter: presenter.value, location: location_.value, script: script.value },
      graphics: {
        lowerText: lowerText.value, lowerTitle: lowerTitle.value, screenHeadline: screenHeadline.value, ticker: ticker.value,
        theme: theme.value, gfxOpacity: gfxOpacity.value, logoOpacity: logoOpacity.value,
        showLower: showLower.checked, showHeadline: showHeadline.checked, showTicker: showTicker.checked, showLogo: showLogo.checked,
      },
      scenes, analysis: lastAnalysis, savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(proj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (bulletinName.value || "bulletin-project").replace(/\s+/g, "-").toLowerCase() + ".json";
    a.click();
  });

  // ---------- RESET EDITS ----------
  resetBtn.addEventListener("click", () => {
    lowerText.value = "NEWS PRESENTER"; lowerTitle.value = "NEWS"; screenHeadline.value = "";
    ticker.value = "LATEST NEWS \u2022 EDUCATION \u2022 COMMUNITY \u2022 SPORTS \u2022 WEATHER";
    delete ticker.dataset.userEdited;
    theme.value = "classic"; gfxOpacity.value = 1; logoOpacity.value = .9;
    showLower.checked = showHeadline.checked = showTicker.checked = showLogo.checked = true;
    aiReport.textContent = "AI Director waiting for a story.";
    qcReport.textContent = "Broadcast quality control has not been run.";
    gfxStatus.textContent = "Ready"; aiStatus.textContent = "Idle"; qcStatus.textContent = "Not checked";
    lastAnalysis = null; scenes = []; renderScenes();
    setStatus("READY");
  });

  // ---------- EXPORT (record composited canvas + audio) ----------
  recordBtn.addEventListener("click", async () => {
    if (!mediaLoaded) { setStatus("IMPORT VIDEO FIRST", "warn"); return; }

    if (recorder && recorder.state === "recording") {
      recorder.stop();
      video.pause();
      return;
    }

    const canvasStream = canvas.captureStream(30);
    try {
      const srcStream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
      srcStream.getAudioTracks().forEach(t => canvasStream.addTrack(t));
    } catch (e) { /* no audio available */ }

    let mime = "video/webm;codecs=vp9,opus";
    if (!MediaRecorder.isTypeSupported(mime)) mime = "video/webm";
    recorder = new MediaRecorder(canvasStream, { mimeType: mime });
    recChunks = [];
    recorder.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recChunks, { type: "video/webm" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (bulletinName.value || "newsroom-export") + ".webm";
      a.click();
      recordBtn.classList.remove("recording");
      recordBtn.textContent = "\u25cf EXPORT";
      setStatus("EXPORT SAVED");
    };

    video.currentTime = 0;
    await seekAndWait(0);
    video.play();
    recorder.start();
    recordBtn.classList.add("recording");
    recordBtn.textContent = "\u25a0 STOP";
    setStatus("RECORDING", "rec");

    video.addEventListener("ended", function onEnd() {
      video.removeEventListener("ended", onEnd);
      if (recorder && recorder.state === "recording") recorder.stop();
    });
  });

})();
