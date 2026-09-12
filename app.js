(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const video = $("video");
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");

  const empty = $("empty");
  const liveBadge = $("liveBadge");
  const stage = $("stage");

  const statusEl = $("status");
  const projectName = $("projectName");

  const videoFile = $("videoFile");
  const logoFile = $("logoFile");
  const bulletinName = $("bulletinName");

  const headline = $("headline");
  const presenter = $("presenter");
  const location_ = $("location");
  const script = $("script");

  const analyzeBtn = $("analyze");
  const aiReport = $("aiReport");
  const sceneList = $("sceneList");

  const playBtn = $("play");
  const pauseBtn = $("pause");
  const backBtn = $("back");
  const fwdBtn = $("forward");
  const fsBtn = $("fullscreen");

  const aiProduceBtn = $("aiProduce");
  const recordBtn = $("record");

  const currentEl = $("current");
  const durationEl = $("duration");
  const seek = $("seek");

  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tabPanel");

  const dropzone = $("dropzone");
  const mediaInfo = $("mediaInfo");
  const videoClip = $("videoClip");
  const audioClip = $("audioClip");

  const presenterVol = $("presenterVol");
  const qcReport = $("qcReport");

  const lowerText = $("lowerText");
  const lowerTitle = $("lowerTitle");
  const screenHeadline = $("screenHeadline");
  const ticker = $("ticker");

  const theme = $("theme");
  const gfxOpacity = $("gfxOpacity");
  const logoOpacity = $("logoOpacity");

  const showLower = $("showLower");
  const showHeadline = $("showHeadline");
  const showTicker = $("showTicker");
  const showLogo = $("showLogo");

  const applyBtn = $("apply");
  const findShotsBtn = $("findShots");
  const runQcBtn = $("runQc");
  const saveBtn = $("save");
  const resetBtn = $("reset");

  const mediaStatus = $("mediaStatus");
  const gfxStatus = $("gfxStatus");
  const aiStatus = $("aiStatus");
  const qcStatus = $("qcStatus");

  let mediaLoaded = false;
  let logoImg = null;
  let scenes = [];
  let lastAnalysis = null;
  let tickerX = 0;

  let recorder = null;
  let recChunks = [];

  const CRIMSON = "#c8102e";
  const GOLD = "#d1a13f";
  const CYAN = "#48c9e8";
  const WHITE = "#ffffff";

  const THEMES = {
    classic: {
      accent: GOLD,
      cyan: CYAN
    },

    dark: {
      accent: CYAN,
      cyan: CYAN
    },

    light: {
      accent: CRIMSON,
      cyan: "#147c9b"
    }
  };

  function setStatus(text, mode = "") {
    statusEl.textContent = text;
    statusEl.className = "status" + (mode ? " " + mode : "");
  }

  function fmtTime(seconds) {
    seconds = Math.max(0, Math.floor(Number(seconds) || 0));

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  /* =========================================================
     TABS
  ========================================================= */

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");

      const panel = $("tab-" + tab.dataset.tab);

      if (panel) {
        panel.classList.add("active");
      }
    });
  });

  /* =========================================================
     VIDEO IMPORT
  ========================================================= */

  function loadVideoFile(file) {
    if (!file || !file.type.startsWith("video/")) return;

    const oldSource = video.src;

    if (oldSource && oldSource.startsWith("blob:")) {
      URL.revokeObjectURL(oldSource);
    }

    const url = URL.createObjectURL(file);

    video.src = url;
    video.load();

    video.addEventListener(
      "loadedmetadata",
      function metadataReady() {
        video.removeEventListener("loadedmetadata", metadataReady);

        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;

        mediaLoaded = true;

        empty.style.display = "none";
        liveBadge.classList.add("on");
        canvas.classList.add("on");

        seek.min = 0;
        seek.max = Math.floor(video.duration || 0);
        seek.value = 0;

        currentEl.textContent = "00:00";
        durationEl.textContent = fmtTime(video.duration);

        const sizeMB = (file.size / 1024 / 1024).toFixed(1);

        const aspect = video.videoHeight
          ? (video.videoWidth / video.videoHeight).toFixed(2)
          : "—";

        mediaInfo.innerHTML = `
          <div class="card">
            <b>${video.videoWidth}×${video.videoHeight}</b>
            Resolution
          </div>

          <div class="card">
            <b>${fmtTime(video.duration)}</b>
            Duration
          </div>

          <div class="card">
            <b>${sizeMB} MB</b>
            File size
          </div>

          <div class="card">
            <b>${aspect}:1</b>
            Aspect ratio
          </div>
        `;

        videoClip.textContent =
          `${file.name} — ${fmtTime(video.duration)}`;

        audioClip.textContent =
          hasAudioTrack()
            ? "Presenter audio detected"
            : "Audio verification unavailable";

        mediaStatus.textContent = "Loaded";

        setStatus("MEDIA LOADED");

        drawProgram();
      }
    );
  }

  videoFile.addEventListener("change", event => {
    loadVideoFile(event.target.files[0]);
  });

  /* =========================================================
     LOGO
  ========================================================= */

  logoFile.addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) return;

    const img = new Image();

    img.onload = () => {
      logoImg = img;
      gfxStatus.textContent = "Logo loaded";
    };

    img.src = URL.createObjectURL(file);
  });

  /* =========================================================
     DRAG VIDEO
  ========================================================= */

  dropzone.addEventListener("dragover", event => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", event => {
    event.preventDefault();

    dropzone.classList.remove("dragover");

    const file = event.dataTransfer.files[0];

    if (file && file.type.startsWith("video/")) {
      loadVideoFile(file);
    }
  });

  /* =========================================================
     VIDEO CONTROLS
  ========================================================= */

  playBtn.addEventListener("click", () => {
    if (mediaLoaded) video.play();
  });

  pauseBtn.addEventListener("click", () => {
    if (mediaLoaded) video.pause();
  });

  backBtn.addEventListener("click", () => {
    if (!mediaLoaded) return;

    video.currentTime =
      Math.max(0, video.currentTime - 5);
  });

  fwdBtn.addEventListener("click", () => {
    if (!mediaLoaded) return;

    video.currentTime =
      Math.min(video.duration, video.currentTime + 5);
  });

  fsBtn.addEventListener("click", () => {
    if (stage.requestFullscreen) {
      stage.requestFullscreen();
    }
  });

  presenterVol.addEventListener("input", () => {
    video.volume = Number(presenterVol.value);
  });

  let seekDragging = false;

  video.addEventListener("timeupdate", () => {
    currentEl.textContent =
      fmtTime(video.currentTime);

    if (!seekDragging) {
      seek.value =
        Math.floor(video.currentTime);
    }
  });

  seek.addEventListener("mousedown", () => {
    seekDragging = true;
  });

  seek.addEventListener("touchstart", () => {
    seekDragging = true;
  });

  seek.addEventListener("input", () => {
    if (mediaLoaded) {
      video.currentTime = Number(seek.value);
    }
  });

  seek.addEventListener("change", () => {
    seekDragging = false;
  });

  /* =========================================================
     AUDIO DETECTION
  ========================================================= */

  function hasAudioTrack() {
    try {
      const stream =
        video.captureStream
          ? video.captureStream()
          : video.mozCaptureStream?.();

      if (!stream) return null;

      return stream.getAudioTracks().length > 0;
    } catch {
      return null;
    }
  }

  /* =========================================================
     CANVAS HELPERS
  ========================================================= */

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);

    ctx.beginPath();

    ctx.moveTo(x + radius, y);

    ctx.arcTo(
      x + w,
      y,
      x + w,
      y + h,
      radius
    );

    ctx.arcTo(
      x + w,
      y + h,
      x,
      y + h,
      radius
    );

    ctx.arcTo(
      x,
      y + h,
      x,
      y,
      radius
    );

    ctx.arcTo(
      x,
      y,
      x + w,
      y,
      radius
    );

    ctx.closePath();
  }

  /* =========================================================
     VIRTUAL NEWSROOM
  ========================================================= */

  function drawStudio(W, H, t) {

    /* BACKGROUND */

    const bg =
      ctx.createLinearGradient(
        0,
        0,
        0,
        H
      );

    bg.addColorStop(0, "#07172b");
    bg.addColorStop(0.45, "#0b2942");
    bg.addColorStop(1, "#02060c");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* CENTRAL LIGHT */

    const glow =
      ctx.createRadialGradient(
        W * 0.5,
        H * 0.34,
        10,
        W * 0.5,
        H * 0.34,
        W * 0.58
      );

    glow.addColorStop(
      0,
      "rgba(65,205,240,.22)"
    );

    glow.addColorStop(
      0.55,
      "rgba(30,100,150,.08)"
    );

    glow.addColorStop(
      1,
      "rgba(0,0,0,0)"
    );

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    /* LEFT ARCH */

    ctx.fillStyle =
      "rgba(1,7,15,.88)";

    ctx.beginPath();

    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.20, 0);
    ctx.lineTo(W * 0.28, H * 0.78);
    ctx.lineTo(0, H);

    ctx.closePath();
    ctx.fill();

    /* RIGHT ARCH */

    ctx.beginPath();

    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.80, 0);
    ctx.lineTo(W * 0.72, H * 0.78);
    ctx.lineTo(W, H);

    ctx.closePath();
    ctx.fill();

    /* LED WALL */

    roundRect(
      W * 0.21,
      H * 0.07,
      W * 0.58,
      H * 0.69,
      20
    );

    ctx.fillStyle =
      "#020810";

    ctx.fill();

    ctx.strokeStyle =
      "rgba(65,210,240,.35)";

    ctx.lineWidth = 3;

    ctx.stroke();

    /* LED PANELS */

    for (let i = 0; i < 11; i++) {

      const x =
        W * 0.225 +
        i * (W * 0.55 / 10);

      ctx.fillStyle =
        i % 2 === 0
          ? "rgba(70,190,230,.055)"
          : "rgba(255,255,255,.025)";

      ctx.fillRect(
        x,
        H * 0.10,
        Math.max(2, W * 0.006),
        H * 0.63
      );
    }

    /* NEWS GRID */

    ctx.save();

    ctx.strokeStyle =
      "rgba(60,200,240,.22)";

    ctx.lineWidth = 2;

    for (let i = 0; i < 7; i++) {

      const y =
        H * 0.18 +
        i * H * 0.07;

      ctx.beginPath();

      ctx.moveTo(W * 0.25, y);
      ctx.lineTo(W * 0.75, y);

      ctx.stroke();
    }

    ctx.beginPath();

    ctx.arc(
      W * 0.5,
      H * 0.40,
      H * 0.20,
      0,
      Math.PI * 2
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
      W * 0.5,
      H * 0.20
    );

    ctx.lineTo(
      W * 0.5,
      H * 0.60
    );

    ctx.moveTo(
      W * 0.36,
      H * 0.40
    );

    ctx.lineTo(
      W * 0.64,
      H * 0.40
    );

    ctx.stroke();

    ctx.restore();

    /* SIDE SCREENS */

    drawSideScreen(
      W * 0.025,
      H * 0.17,
      W * 0.145,
      H * 0.28,
      "LIVE",
      t
    );

    drawSideScreen(
      W * 0.83,
      H * 0.17,
      W * 0.145,
      H * 0.28,
      "NEWS",
      t
    );

    /* FLOOR */

    const floor =
      ctx.createLinearGradient(
        0,
        H * 0.76,
        0,
        H
      );

    floor.addColorStop(
      0,
      "#132b43"
    );

    floor.addColorStop(
      1,
      "#02050a"
    );

    ctx.fillStyle = floor;

    ctx.beginPath();

    ctx.moveTo(
      W * 0.12,
      H * 0.77
    );

    ctx.lineTo(
      W * 0.88,
      H * 0.77
    );

    ctx.lineTo(W, H);

    ctx.lineTo(0, H);

    ctx.closePath();

    ctx.fill();

    /* FLOOR PERSPECTIVE */

    ctx.strokeStyle =
      "rgba(100,210,240,.10)";

    ctx.lineWidth = 2;

    for (let i = -5; i <= 5; i++) {

      ctx.beginPath();

      ctx.moveTo(
        W * 0.5,
        H * 0.77
      );

      ctx.lineTo(
        W * 0.5 + i * W * 0.12,
        H
      );

      ctx.stroke();
    }

    /* DESK */

    const deskY = H * 0.79;

    ctx.fillStyle =
      "rgba(9,24,40,.92)";

    ctx.beginPath();

    ctx.moveTo(
      W * 0.12,
      deskY
    );

    ctx.lineTo(
      W * 0.88,
      deskY
    );

    ctx.lineTo(
      W * 0.96,
      H
    );

    ctx.lineTo(
      W * 0.04,
      H
    );

    ctx.closePath();

    ctx.fill();

    ctx.strokeStyle =
      "rgba(75,210,240,.38)";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(
      W * 0.12,
      deskY
    );

    ctx.lineTo(
      W * 0.88,
      deskY
    );

    ctx.stroke();
  }

  function drawSideScreen(
    x,
    y,
    w,
    h,
    label,
    t
  ) {

    roundRect(
      x,
      y,
      w,
      h,
      12
    );

    ctx.fillStyle =
      "rgba(1,7,14,.95)";

    ctx.fill();

    ctx.strokeStyle =
      "rgba(65,205,240,.28)";

    ctx.lineWidth = 2;

    ctx.stroke();

    ctx.fillStyle =
      "rgba(65,205,240,.10)";

    ctx.fillRect(
      x + 10,
      y + 10,
      w - 20,
      h * 0.38
    );

    ctx.fillStyle = WHITE;

    ctx.font =
      `800 ${Math.max(12, w * .09)}px Arial`;

    ctx.fillText(
      label,
      x + 14,
      y + 30
    );

    ctx.strokeStyle =
      "rgba(65,205,240,.38)";

    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {

      const yy =
        y + h * 0.55 +
        i * 13;

      ctx.beginPath();

      ctx.moveTo(
        x + 14,
        yy
      );

      ctx.lineTo(
        x + w - 14,
        yy
      );

      ctx.stroke();
    }
  }

  /* =========================================================
     PRESENTER VIDEO
  ========================================================= */

  function drawPresenter(W, H) {

    if (
      !mediaLoaded ||
      video.readyState < 2
    ) {
      return;
    }

    const x = W * 0.27;
    const y = H * 0.12;
    const w = W * 0.46;
    const h = H * 0.57;

    /* FRAME */

    ctx.save();

    ctx.shadowColor =
      "rgba(0,0,0,.75)";

    ctx.shadowBlur = 35;

    ctx.fillStyle = "#000";

    ctx.fillRect(
      x - 8,
      y - 8,
      w + 16,
      h + 16
    );

    ctx.restore();

    /* VIDEO */

    ctx.save();

    ctx.beginPath();

    ctx.rect(
      x,
      y,
      w,
      h
    );

    ctx.clip();

    ctx.drawImage(
      video,
      x,
      y,
      w,
      h
    );

    /* SUBTLE LIGHT */

    const shade =
      ctx.createLinearGradient(
        0,
        y,
        0,
        y + h
      );

    shade.addColorStop(
      0,
      "rgba(0,0,0,.05)"
    );

    shade.addColorStop(
      .8,
      "rgba(0,0,0,0)"
    );

    shade.addColorStop(
      1,
      "rgba(0,0,0,.20)"
    );

    ctx.fillStyle = shade;

    ctx.fillRect(
      x,
      y,
      w,
      h
    );

    ctx.restore();

    /* FRAME BORDER */

    ctx.strokeStyle =
      "rgba(100,220,245,.65)";

    ctx.lineWidth = 2;

    ctx.strokeRect(
      x,
      y,
      w,
      h
    );
  }

  /* =========================================================
     BROADCAST GRAPHICS
  ========================================================= */

  function drawGraphics(W, H, t) {

    const alpha =
      Number(gfxOpacity.value);

    ctx.save();

    ctx.globalAlpha = alpha;

    /* TOP BAR */

    ctx.fillStyle =
      "rgba(1,6,12,.88)";

    ctx.fillRect(
      0,
      0,
      W,
      64
    );

    /* LOGO */

    if (showLogo.checked) {

      if (logoImg) {

        const logoH = 38;

        const logoW =
          logoImg.width *
          logoH /
          logoImg.height;

        ctx.globalAlpha =
          alpha *
          Number(logoOpacity.value);

        ctx.drawImage(
          logoImg,
          22,
          13,
          logoW,
          logoH
        );

        ctx.globalAlpha = alpha;

      } else {

        ctx.fillStyle =
          CRIMSON;

        ctx.fillRect(
          20,
          13,
          145,
          38
        );

        ctx.fillStyle =
          WHITE;

        ctx.font =
          "800 18px Arial";

        ctx.fillText(
          (
            bulletinName.value ||
            "NEWS"
          ).toUpperCase(),
          32,
          39
        );
      }
    }

    /* NETWORK */

    ctx.fillStyle =
      "rgba(255,255,255,.72)";

    ctx.font =
      "600 13px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
      (
        bulletinName.value ||
        "LIVE NEWS"
      ).toUpperCase(),
      W * .5,
      39
    );

    ctx.textAlign = "left";

    /* LIVE */

    ctx.fillStyle =
      CRIMSON;

    ctx.fillRect(
      W - 135,
      13,
      112,
      38
    );

    ctx.fillStyle =
      WHITE;

    ctx.font =
      "800 14px Arial";

    ctx.fillText(
      "● LIVE",
      W - 115,
      38
    );

    /* HEADLINE */

    if (
      showHeadline.checked &&
      (
        screenHeadline.value ||
        headline.value
      )
    ) {

      const text =
        (
          screenHeadline.value ||
          headline.value
        ).toUpperCase();

      const y = H * .69;

      ctx.fillStyle =
        CRIMSON;

      ctx.fillRect(
        0,
        y,
        W,
        55
      );

      ctx.fillStyle =
        WHITE;

      ctx.font =
        `800 ${Math.max(20, W * .018)}px Arial`;

      ctx.fillText(
        text.slice(0, 120),
        28,
        y + 36
      );
    }

    /* LOWER THIRD */

    if (showLower.checked) {

      const y = H * .755;
      const width = W * .55;

      ctx.fillStyle =
        "rgba(2,8,15,.95)";

      ctx.fillRect(
        0,
        y,
        width,
        76
      );

      ctx.fillStyle =
        t.accent;

      ctx.fillRect(
        0,
        y,
        width,
        5
      );

      ctx.fillStyle =
        CRIMSON;

      ctx.fillRect(
        0,
        y,
        7,
        76
      );

      ctx.fillStyle =
        WHITE;

      ctx.font =
        `800 ${Math.max(19, W * .017)}px Arial`;

      ctx.fillText(
        (
          lowerText.value ||
          "NEWS PRESENTER"
        ).toUpperCase(),
        28,
        y + 35
      );

      ctx.fillStyle =
        "rgba(220,230,240,.78)";

      ctx.font =
        `600 ${Math.max(12, W * .010)}px Arial`;

      ctx.fillText(
        (
          lowerTitle.value ||
          "NEWS"
        ).toUpperCase(),
        28,
        y + 59
      );
    }

    /* LOCATION */

    if (location_.value) {

      ctx.fillStyle =
        "rgba(0,0,0,.78)";

      ctx.fillRect(
        W - 300,
        H * .755,
        276,
        42
      );

      ctx.fillStyle =
        t.accent;

      ctx.fillRect(
        W - 300,
        H * .755,
        5,
        42
      );

      ctx.fillStyle =
        WHITE;

      ctx.font =
        "700 11px Arial";

      ctx.fillText(
        "REPORTING FROM",
        W - 282,
        H * .755 + 16
      );

      ctx.font =
        "800 14px Arial";

      ctx.fillText(
        location_.value.toUpperCase(),
        W - 282,
        H * .755 + 34
      );
    }

    /* TICKER */

    if (showTicker.checked) {

      const height = 46;

      ctx.fillStyle =
        "rgba(1,6,12,.97)";

      ctx.fillRect(
        0,
        H - height,
        W,
        height
      );

      ctx.fillStyle =
        CRIMSON;

      ctx.fillRect(
        0,
        H - height,
        126,
        height
      );

      ctx.fillStyle =
        WHITE;

      ctx.font =
        "800 14px Arial";

      ctx.fillText(
        "LATEST",
        24,
        H - height / 2 + 5
      );

      ctx.save();

      ctx.beginPath();

      ctx.rect(
        126,
        H - height,
        W - 126,
        height
      );

      ctx.clip();

      ctx.fillStyle =
        WHITE;

      ctx.font =
        "600 15px Arial";

      const text =
        ticker.value ||
        "LATEST NEWS";

      ctx.fillText(
        text,
        tickerX,
        H - height / 2 + 5
      );

      tickerX -= 2;

      const width =
        ctx.measureText(text).width;

      if (tickerX < -width) {
        tickerX = W;
      }

      ctx.restore();
    }

    /* FRAME */

    ctx.strokeStyle =
      "rgba(255,255,255,.14)";

    ctx.lineWidth = 2;

    ctx.strokeRect(
      8,
      8,
      W - 16,
      H - 16
    );

    ctx.restore();
  }

  /* =========================================================
     PROGRAM OUTPUT
  ========================================================= */

  function drawProgram() {

    const W =
      canvas.width || 1920;

    const H =
      canvas.height || 1080;

    const t =
      THEMES[theme.value] ||
      THEMES.classic;

    ctx.clearRect(
      0,
      0,
      W,
      H
    );

    drawStudio(
      W,
      H,
      t
    );

    drawPresenter(
      W,
      H
    );

    drawGraphics(
      W,
      H,
      t
    );
  }

  function renderLoop() {
    drawProgram();
    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);

  /* =========================================================
     STORY AI
  ========================================================= */

  const STOPWORDS =
    new Set(
      "a an the of to in on for with and or but is are was were be been being this that it its as at by from into over under after before during than then so if not no yes will would can could should may might we you they he she i our your their".split(" ")
    );

  function analyzeStory() {

    const text =
      `${headline.value} ${script.value}`.trim();

    if (!text) {

      aiReport.textContent =
        "Add a headline or story script.";

      return;
    }

    const words =
      text
        .toLowerCase()
        .match(/[a-z']+/g) || [];

    const frequency = {};

    words.forEach(word => {

      if (
        word.length > 3 &&
        !STOPWORDS.has(word)
      ) {
        frequency[word] =
          (frequency[word] || 0) + 1;
      }
    });

    const keywords =
      Object.entries(frequency)
        .sort((a,b) => b[1] - a[1])
        .slice(0,7)
        .map(item => item[0]);

    const readingSeconds =
      Math.round(
        words.length / 150 * 60
      );

    const breaking =
      /\b(breaking|urgent|just in|developing|alert)\b/i
        .test(text);

    lastAnalysis = {
      wordCount: words.length,
      keywords,
      readingSeconds,
      isBreaking: breaking
    };

    if (!ticker.dataset.userEdited) {

      ticker.value =
        `${headline.value ? headline.value.toUpperCase() + " • " : ""}` +
        keywords
          .map(k => k.toUpperCase())
          .join(" • ");
    }

    aiReport.innerHTML =
      `<b>AI STORY ANALYSIS</b>\n` +
      `Words: <b>${words.length}</b>\n` +
      `Estimated read: <b>${fmtTime(readingSeconds)}</b>\n` +
      `Keywords: <b>${keywords.join(", ") || "none"}</b>\n` +
      `Priority: <b>${breaking ? "BREAKING" : "STANDARD"}</b>`;

    aiStatus.textContent =
      "Analyzed";
  }

  analyzeBtn.addEventListener(
    "click",
    analyzeStory
  );

  ticker.addEventListener(
    "input",
    () => {
      ticker.dataset.userEdited = "1";
    }
  );

  /* =========================================================
     SHOT DETECTION
  ========================================================= */

  function seekAndWait(time) {

    return new Promise(resolve => {

      const handler = () => {

        video.removeEventListener(
          "seeked",
          handler
        );

        resolve();
      };

      video.addEventListener(
        "seeked",
        handler
      );

      video.currentTime = time;
    });
  }

  async function findBestShots() {

    if (!mediaLoaded) {

      aiReport.textContent =
        "Import the news video first.";

      return;
    }

    setStatus(
      "ANALYZING VIDEO",
      "busy"
    );

    aiStatus.textContent =
      "Scanning";

    const wasPlaying =
      !video.paused;

    video.pause();

    const duration =
      video.duration;

    const sampleCount =
      Math.min(
        36,
        Math.max(
          10,
          Math.floor(duration / 2)
        )
      );

    const step =
      duration / sampleCount;

    const sampleCanvas =
      document.createElement("canvas");

    sampleCanvas.width = 64;
    sampleCanvas.height = 36;

    const sampleCtx =
      sampleCanvas.getContext("2d");

    let previous = null;

    const differences = [];

    for (
      let i = 0;
      i < sampleCount;
      i++
    ) {

      const time =
        Math.min(
          duration - .05,
          i * step + step / 2
        );

      await seekAndWait(time);

      sampleCtx.drawImage(
        video,
        0,
        0,
        64,
        36
      );

      const data =
        sampleCtx.getImageData(
          0,
          0,
          64,
          36
        ).data;

      if (previous) {

        let score = 0;

        for (
          let p = 0;
          p < data.length;
          p += 4
        ) {

          score +=
            Math.abs(
              data[p] -
              previous[p]
            );

          score +=
            Math.abs(
              data[p + 1] -
              previous[p + 1]
            );

          score +=
            Math.abs(
              data[p + 2] -
              previous[p + 2]
            );
        }

        differences.push({
          time,
          score
        });
      }

      previous = data;
    }

    differences.sort(
      (a,b) =>
        b.score - a.score
    );

    scenes =
      differences
        .slice(0,8)
        .sort(
          (a,b) =>
            a.time - b.time
        )
        .map(
          (item,index) => ({
            label:
              `SHOT ${String(index + 1).padStart(2,"0")}`,
            note:
              "High visual change",
            t:
              item.time
          })
        );

    renderScenes();

    aiStatus.textContent =
      "Shots detected";

    setStatus(
      "MEDIA LOADED"
    );

    if (wasPlaying) {
      video.play();
    }
  }

  findShotsBtn.addEventListener(
    "click",
    findBestShots
  );

  function renderScenes() {

    if (!scenes.length) {

      sceneList.innerHTML =
        `<p class="hint">
          Run FIND BEST SHOTS after importing a video.
        </p>`;

      return;
    }

    sceneList.innerHTML =
      scenes.map(
        (scene,index) => `
          <div
            class="scene-chip"
            data-i="${index}"
          >
            <span>
              <b>${scene.label}</b>
              ${scene.note}
            </span>

            <b>
              ${fmtTime(scene.t)}
            </b>
          </div>
        `
      ).join("");

    sceneList
      .querySelectorAll(".scene-chip")
      .forEach(element => {

        element.addEventListener(
          "click",
          () => {

            const scene =
              scenes[
                Number(element.dataset.i)
              ];

            if (mediaLoaded) {
              video.currentTime =
                scene.t;
            }
          }
        );
      });
  }

  /* =========================================================
     APPLY BROADCAST LOOK
  ========================================================= */

  function applyBroadcastLook() {

    if (presenter.value) {

      lowerText.value =
        presenter.value.toUpperCase();
    }

    lowerTitle.value =
      location_.value
        ? `REPORTING — ${location_.value.toUpperCase()}`
        : "NEWS";

    if (headline.value) {

      screenHeadline.value =
        headline.value;
    }

    showLower.checked = true;
    showHeadline.checked = true;
    showTicker.checked = true;
    showLogo.checked = true;

    gfxStatus.textContent =
      "Applied";

    setStatus(
      "BROADCAST READY"
    );
  }

  applyBtn.addEventListener(
    "click",
    applyBroadcastLook
  );

  /* =========================================================
     BROADCAST QC
  ========================================================= */

  function qcRow(
    label,
    state,
    detail
  ) {

    const className =
      state === "pass"
        ? "pass"
        : state === "warn"
        ? "warn"
        : "fail";

    const word =
      state === "pass"
        ? "PASS"
        : state === "warn"
        ? "CHECK"
        : "FAIL";

    return `
      <div class="qc-row">
        <span>
          ${label} — ${detail}
        </span>

        <span class="${className}">
          ${word}
        </span>
      </div>
    `;
  }

  function runQc() {

    if (!mediaLoaded) {

      qcReport.textContent =
        "Import video before running QC.";

      return;
    }

    const width =
      video.videoWidth;

    const height =
      video.videoHeight;

    const aspect =
      width / height;

    const rows = [];

    rows.push(
      qcRow(
        "Resolution",
        width >= 1280 && height >= 720
          ? "pass"
          : "warn",
        `${width}×${height}`
      )
    );

    rows.push(
      qcRow(
        "Aspect ratio",
        Math.abs(
          aspect - 16 / 9
        ) < .05
          ? "pass"
          : "warn",
        `${aspect.toFixed(2)}:1`
      )
    );

    rows.push(
      qcRow(
        "Duration",
        video.duration >= 5
          ? "pass"
          : "warn",
        fmtTime(video.duration)
      )
    );

    const audio =
      hasAudioTrack();

    rows.push(
      qcRow(
        "Audio",
        audio === true
          ? "pass"
          : audio === false
          ? "fail"
          : "warn",
        audio === true
          ? "detected"
          : "verification unavailable"
      )
    );

    rows.push(
      qcRow(
        "Headline",
        screenHeadline.value ||
        headline.value
          ? "pass"
          : "warn",
        screenHeadline.value ||
        headline.value
          ? "set"
          : "missing"
      )
    );

    rows.push(
      qcRow(
        "Lower third",
        lowerText.value
          ? "pass"
          : "warn",
        lowerText.value
          ? "set"
          : "missing"
      )
    );

    qcReport.innerHTML =
      rows.join("");

    const fail =
      qcReport
        .querySelectorAll(".fail")
        .length;

    const warn =
      qcReport
        .querySelectorAll(".warn")
        .length;

    qcStatus.textContent =
      fail
        ? "Issues found"
        : warn
        ? "Warnings"
        : "Passed";
  }

  runQcBtn.addEventListener(
    "click",
    runQc
  );

  /* =========================================================
     AI PRODUCE
  ========================================================= */

  async function aiProduce() {

    setStatus(
      "PRODUCING",
      "busy"
    );

    analyzeStory();

    applyBroadcastLook();

    if (mediaLoaded) {

      await findBestShots();

      runQc();
    }

    aiStatus.textContent =
      "Produced";

    setStatus(
      "PROGRAM READY"
    );
  }

  aiProduceBtn.addEventListener(
    "click",
    aiProduce
  );

  /* =========================================================
     SAVE PROJECT
  ========================================================= */

  saveBtn.addEventListener(
    "click",
    () => {

      const project = {

        bulletinName:
          bulletinName.value,

        story: {

          headline:
            headline.value,

          presenter:
            presenter.value,

          location:
            location_.value,

          script:
            script.value
        },

        graphics: {

          lowerText:
            lowerText.value,

          lowerTitle:
            lowerTitle.value,

          screenHeadline:
            screenHeadline.value,

          ticker:
            ticker.value,

          theme:
            theme.value,

          gfxOpacity:
            gfxOpacity.value,

          logoOpacity:
            logoOpacity.value,

          showLower:
            showLower.checked,

          showHeadline:
            showHeadline.checked,

          showTicker:
            showTicker.checked,

          showLogo:
            showLogo.checked
        },

        scenes,

        analysis:
          lastAnalysis,

        savedAt:
          new Date().toISOString()
      };

      const blob =
        new Blob(
          [
            JSON.stringify(
              project,
              null,
              2
            )
          ],
          {
            type:
              "application/json"
          }
        );

      const link =
        document.createElement("a");

      link.href =
        URL.createObjectURL(blob);

      link.download =
        (
          bulletinName.value ||
          "ai-newsroom-project"
        )
          .replace(/\s+/g,"-")
          .toLowerCase() +
        ".json";

      link.click();
    }
  );

  /* =========================================================
     RESET
  ========================================================= */

  resetBtn.addEventListener(
    "click",
    () => {

      lowerText.value =
        "NEWS PRESENTER";

      lowerTitle.value =
        "NEWS";

      screenHeadline.value =
        "";

      ticker.value =
        "LATEST NEWS • EDUCATION • COMMUNITY • SPORTS • WEATHER";

      delete ticker.dataset.userEdited;

      theme.value =
        "classic";

      gfxOpacity.value =
        "1";

      logoOpacity.value =
        ".9";

      showLower.checked = true;
      showHeadline.checked = true;
      showTicker.checked = true;
      showLogo.checked = true;

      aiReport.textContent =
        "AI Director waiting for a story.";

      qcReport.textContent =
        "Broadcast quality control has not been run.";

      gfxStatus.textContent =
        "Ready";

      aiStatus.textContent =
        "Idle";

      qcStatus.textContent =
        "Not checked";

      lastAnalysis = null;
      scenes = [];

      renderScenes();

      setStatus(
        mediaLoaded
          ? "MEDIA LOADED"
          : "READY"
      );
    }
  );

  /* =========================================================
     EXPORT PROGRAM OUTPUT
  ========================================================= */

  recordBtn.addEventListener(
    "click",
    async () => {

      if (!mediaLoaded) {

        setStatus(
          "IMPORT VIDEO FIRST",
          "warn"
        );

        return;
      }

      if (
        recorder &&
        recorder.state === "recording"
      ) {

        recorder.stop();
        video.pause();

        return;
      }

      const stream =
        canvas.captureStream(30);

      try {

        const source =
          video.captureStream
            ? video.captureStream()
            : video.mozCaptureStream?.();

        if (source) {

          source
            .getAudioTracks()
            .forEach(track => {
              stream.addTrack(track);
            });
        }

      } catch {}

      let mime =
        "video/webm;codecs=vp9,opus";

      if (
        !MediaRecorder.isTypeSupported(
          mime
        )
      ) {

        mime =
          "video/webm";
      }

      recorder =
        new MediaRecorder(
          stream,
          {
            mimeType: mime
          }
        );

      recChunks = [];

      recorder.ondataavailable =
        event => {

          if (event.data.size) {
            recChunks.push(
              event.data
            );
          }
        };

      recorder.onstop = () => {

        const blob =
          new Blob(
            recChunks,
            {
              type:
                "video/webm"
            }
          );

        const link =
          document.createElement("a");

        link.href =
          URL.createObjectURL(blob);

        link.download =
          (
            bulletinName.value ||
            "newsroom-program"
          ) +
          ".webm";

        link.click();

        recordBtn.classList.remove(
          "recording"
        );

        recordBtn.textContent =
          "● EXPORT";

        setStatus(
          "EXPORT SAVED"
        );
      };

      video.currentTime = 0;

      await seekAndWait(0);

      video.play();

      recorder.start();

      recordBtn.classList.add(
        "recording"
      );

      recordBtn.textContent =
        "■ STOP";

      setStatus(
        "RECORDING",
        "rec"
      );

      const ended = () => {

        video.removeEventListener(
          "ended",
          ended
        );

        if (
          recorder &&
          recorder.state === "recording"
        ) {
          recorder.stop();
        }
      };

      video.addEventListener(
        "ended",
        ended
      );
    }
  );

  /* =========================================================
     LIVE UI UPDATES
  ========================================================= */

  bulletinName.addEventListener(
    "input",
    () => {

      projectName.textContent =
        (
          bulletinName.value ||
          "UNTITLED BULLETIN"
        ).toUpperCase();
    }
  );

  [
    headline,
    presenter,
    location_,
    script,
    lowerText,
    lowerTitle,
    screenHeadline
  ].forEach(input => {

    input.addEventListener(
      "input",
      drawProgram
    );
  });

  [
    theme,
    gfxOpacity,
    logoOpacity,
    showLower,
    showHeadline,
    showTicker,
    showLogo
  ].forEach(control => {

    control.addEventListener(
      "input",
      drawProgram
    );

    control.addEventListener(
      "change",
      drawProgram
    );
  });

  setStatus("READY");

  renderScenes();

})();
