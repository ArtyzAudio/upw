(function () {
  "use strict";

  const SESSION_KEY = "upw_vault_session_v1";

  const esc = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  async function decryptVault(username, password) {
    const vault = window.ENCRYPTED_VAULT;
    if (!vault || !window.crypto || !window.crypto.subtle) {
      throw new Error("Web Crypto API unavailable in this browser context.");
    }
    const enc = new TextEncoder();
    const secretBytes = enc.encode(`${username.trim()}:${password}`);
    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      secretBytes,
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: b64ToBytes(vault.salt),
        iterations: vault.iter,
        hash: "SHA-256"
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const plainBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(vault.iv) },
      aesKey,
      b64ToBytes(vault.data)
    );
    const jsonStr = new TextDecoder().decode(plainBuf);
    return JSON.parse(jsonStr);
  }

  // Theme initialization (applies to both Login Gate and Unlocked App)
  const savedTheme = localStorage.getItem("upw_theme") || "light";
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
  }

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(`Copied: ${label}`),
        () => fallbackCopy(text, label)
      );
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(`Copied: ${label}`);
    } catch (_) {
      showToast("Clipboard unavailable");
    }
    document.body.removeChild(ta);
  }

  function mountShell() {
    const root = document.getElementById("appRoot");
    root.innerHTML = `
      <header class="topbar" id="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation drawer">
              <span></span><span></span><span></span>
            </button>
            <a href="#overview" class="brand-link">
              <span class="brand-kicker">PRIVATE DOSSIER</span>
              <span class="brand-title">Upwork Secrets</span>
            </a>
          </div>

          <div class="topbar-controls">
            <div class="search-wrap">
              <input
                type="search"
                id="globalSearch"
                class="search-input"
                placeholder="Search rules, signals, secrets, templates... ( / )"
                aria-label="Search playbook"
                autocomplete="off"
              />
              <button class="search-clear" id="searchClear" aria-label="Clear search" hidden>&times;</button>
            </div>
            <button class="theme-btn" id="themeToggle" aria-label="Toggle color theme">Dark Mode</button>
            <button class="btn-secondary" id="lockBtn" aria-label="Lock session">Lock</button>
          </div>
        </div>
      </header>

      <div class="layout">
        <aside class="sidebar" id="sidebar" aria-label="Playbook navigation">
          <div class="sidebar-section">
            <div class="sidebar-label">Playbook Sections</div>
            <nav class="nav-list" id="navList">
              <a href="#overview" class="nav-item active" data-section="overview">01. Dual-Reader Mechanics</a>
              <a href="#shifts" class="nav-item" data-section="shifts">02. 22 Platform Realities</a>
              <a href="#profile" class="nav-item" data-section="profile">03. Profile &amp; Portfolio</a>
              <a href="#vetting" class="nav-item" data-section="vetting">04. Client Vetting &amp; Timing</a>
              <a href="#archetypes" class="nav-item" data-section="archetypes">05. 8 Client Archetypes</a>
              <a href="#decoder" class="nav-item" data-section="decoder">06. Job Signal Decoder</a>
              <a href="#proposals" class="nav-item" data-section="proposals">07. Proposals &amp; Linter</a>
              <a href="#secrets" class="nav-item" data-section="secrets">08. 17 Hidden Edges</a>
              <a href="#closing" class="nav-item" data-section="closing">09. Closing &amp; Protection</a>
              <a href="#specs" class="nav-item" data-section="specs">10. Tech Specs &amp; AI Prompt</a>
            </nav>
          </div>

          <div class="sidebar-section progress-box">
            <div class="sidebar-label">Setup Mastery</div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" id="masteryFill" style="width: 0%"></div>
            </div>
            <div class="progress-meta" id="masteryText">0 / 9 profile steps checked</div>
          </div>
        </aside>

        <main class="main-content" id="mainContent">
          <div class="search-results-panel" id="searchResultsPanel" hidden>
            <div class="search-results-header">
              <h2 id="searchResultsHeading">Search Results</h2>
              <button class="btn-secondary" id="closeSearchResults">Close Search</button>
            </div>
            <div id="searchResultsList" class="search-results-list"></div>
          </div>

          <section id="overview" class="section hero-section">
            <p class="eyebrow">VIDEO EDITING CLIENT ACQUISITION PLAYBOOK</p>
            <h1 class="hero-title">Upwork Secrets</h1>
            <p class="hero-subtitle" id="heroSubtitle"></p>

            <div class="stats-row" id="statsRow"></div>

            <div class="subsection">
              <h2 class="section-heading">The Dual-Reader Evaluation System</h2>
              <p class="section-lead">Every proposal submitted for a video editing brief passes sequentially through two distinct filters before generating an interview reply.</p>
              <div class="two-col-grid" id="dualReaderGrid"></div>
            </div>
          </section>

          <section id="shifts" class="section">
            <div class="section-header-row">
              <div>
                <p class="eyebrow">PLATFORM AUDIT</p>
                <h2 class="section-heading">22 Platform Realities &amp; Debunked Legacy Myths</h2>
              </div>
              <div class="filter-pills" id="riskFilters">
                <button class="pill active" data-risk="ALL">All (22)</button>
                <button class="pill" data-risk="CRITICAL">Critical</button>
                <button class="pill" data-risk="HIGH">High</button>
                <button class="pill" data-risk="MEDIUM">Medium</button>
                <button class="pill" data-risk="LOW">Low</button>
              </div>
            </div>
            <div class="stack-list" id="shiftsList"></div>
          </section>

          <section id="profile" class="section">
            <p class="eyebrow">FOUNDATION &amp; TRUST ARCHITECTURE</p>
            <h2 class="section-heading">Profile Optimization &amp; Portfolio Engineering</h2>
            <p class="section-lead">Check off completed account configuration steps below. State persists locally in the browser.</p>

            <div class="checklist-grid" id="profileChecklist"></div>

            <div class="subsection">
              <h3 class="sub-heading">Portfolio Construction Standards</h3>
              <div class="two-col-grid" id="portfolioRulesGrid"></div>
            </div>
          </section>

          <section id="vetting" class="section">
            <p class="eyebrow">PRE-BID FILTERING &amp; MARKET TIMING</p>
            <h2 class="section-heading">7-Gate Client Vetting Calculator</h2>
            <p class="section-lead">Client selection contributes more to hiring conversion than copywriting alone. Toggle each gate observed on a prospective job post to calculate the bid verdict.</p>

            <div class="vetting-panel">
              <div class="vetting-verdict-bar" id="vettingVerdictBar">
                <div>
                  <span class="verdict-badge" id="verdictBadge">EVALUATE GATES</span>
                  <p class="verdict-summary" id="verdictSummary">Toggle the 7 verification gates below to score a prospective client.</p>
                </div>
                <button class="btn-secondary" id="resetVettingBtn">Reset Gates</button>
              </div>
              <div class="vetting-gates-list" id="vettingGatesList"></div>
            </div>

            <div class="callout-card" id="whalesParadoxCard"></div>

            <div class="subsection">
              <h3 class="sub-heading">Global Timezone &amp; Feed Velocity Matrix</h3>
              <div class="three-col-grid" id="timezoneGrid"></div>
              <ul class="bullet-panel" id="feedMechanicsList"></ul>
            </div>
          </section>

          <section id="archetypes" class="section">
            <p class="eyebrow">BUYER PSYCHOLOGY</p>
            <h2 class="section-heading">The 8 Video Editing Client Archetypes</h2>
            <p class="section-lead">Each buyer category reacts to distinct proof signals, fears different failure modes, and converts on tailored opening hooks.</p>
            <div class="archetype-grid" id="archetypesGrid"></div>
          </section>

          <section id="decoder" class="section">
            <div class="section-header-row">
              <div>
                <p class="eyebrow">SUBTEXT TRANSLATION</p>
                <h2 class="section-heading">16 Job Post Signals Decoded</h2>
              </div>
              <input type="search" id="decoderFilter" class="inline-filter" placeholder="Filter job signals..." aria-label="Filter job post signals" />
            </div>
            <div class="decoder-table-wrap" id="decoderList"></div>
          </section>

          <section id="proposals" class="section">
            <p class="eyebrow">PROPOSAL ENGINEERING</p>
            <h2 class="section-heading">The 6 Iron Laws &amp; Live Pre-Flight Linter</h2>

            <div class="laws-grid" id="ironLawsGrid"></div>

            <div class="linter-card" id="proposalLinter">
              <div class="linter-header">
                <div>
                  <h3 class="sub-heading">Interactive Proposal Pre-Flight Linter</h3>
                  <p class="muted-note">Paste any draft proposal to verify character preview limits, word budget, zero-greeting compliance, AI-slop terms, and policy link hygiene.</p>
                </div>
                <div class="linter-actions">
                  <label class="checkbox-inline">
                    <input type="checkbox" id="hasScreeningToggle" />
                    <span>Job includes 2+ Screening Questions (25–60 word target)</span>
                  </label>
                  <button class="btn-secondary" id="loadSampleDraftBtn">Load Sample Draft</button>
                </div>
              </div>

              <textarea
                id="linterInput"
                class="linter-textarea"
                rows="6"
                placeholder="Paste a draft video editing proposal here to run automated compliance checks..."
                aria-label="Proposal draft input"
              ></textarea>

              <div class="linter-metrics" id="linterMetrics"></div>
              <div class="linter-checks" id="linterChecks"></div>
            </div>

            <div class="subsection">
              <h3 class="sub-heading">Fixed-Price vs. Hourly Proposal Matrix</h3>
              <div class="table-scroll">
                <table class="comparison-table" id="fixedHourlyTable"></table>
              </div>
            </div>

            <div class="subsection">
              <div class="section-header-row">
                <h3 class="sub-heading">15 Field-Tested Proposal Blueprints</h3>
                <div class="filter-pills" id="proposalFilters">
                  <button class="pill active" data-ptype="ALL">All (15)</button>
                  <button class="pill" data-ptype="Fixed">Fixed-Price</button>
                  <button class="pill" data-ptype="Hourly">Hourly</button>
                </div>
              </div>
              <div class="proposals-grid" id="proposalsGrid"></div>
            </div>
          </section>

          <section id="secrets" class="section">
            <p class="eyebrow">ASYMMETRIC ADVANTAGES</p>
            <h2 class="section-heading">17 Non-Obvious Competitive Edges</h2>
            <div class="secrets-grid" id="secretsGrid"></div>
          </section>

          <section id="closing" class="section">
            <p class="eyebrow">REVENUE CONVERSION &amp; PROTECTION</p>
            <h2 class="section-heading">Interview Closing, Escrow Safety &amp; LTV Scaling</h2>

            <div class="two-col-grid">
              <div class="info-card">
                <h3 class="card-title">Immediate Interview Protocol</h3>
                <ol class="ordered-list" id="interviewProtocolList"></ol>
              </div>
              <div class="info-card">
                <h3 class="card-title">Escrow, Hourly Memos &amp; Ghost Protocol</h3>
                <ol class="ordered-list" id="escrowRulesList"></ol>
              </div>
            </div>

            <div class="subsection">
              <h3 class="sub-heading">Operational Client Communication Scripts</h3>
              <div class="stack-list" id="operationalScriptsList"></div>
            </div>
          </section>

          <section id="specs" class="section">
            <p class="eyebrow">CRAFT STANDARDS &amp; AUTOMATION</p>
            <h2 class="section-heading">Client-Winning Technical Specs &amp; AI Prompt</h2>

            <div class="three-col-grid" id="techSpecsGrid"></div>

            <div class="prompt-card">
              <div class="prompt-card-header">
                <div>
                  <h3 class="card-title">Master AI Proposal Strategist Prompt</h3>
                  <p class="muted-note">Copy this system prompt into any modern LLM, then paste raw job descriptions to generate vetted, policy-compliant proposal variations.</p>
                </div>
                <button class="btn-primary" id="copyMasterPromptBtn">Copy System Prompt</button>
              </div>
              <pre class="prompt-code" id="masterPromptPre"></pre>
            </div>
          </section>
        </main>
      </div>
    `;
  }

  function initPlaybookApp(DATA) {
    document.title = DATA.meta.title;
    document.getElementById("authGate").hidden = true;
    const appRoot = document.getElementById("appRoot");
    appRoot.hidden = false;
    mountShell();

    // Theme button
    const themeBtn = document.getElementById("themeToggle");
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      themeBtn.textContent = "Light Mode";
    }
    themeBtn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("upw_theme", "light");
        themeBtn.textContent = "Dark Mode";
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("upw_theme", "dark");
        themeBtn.textContent = "Light Mode";
      }
    });

    // Lock button
    document.getElementById("lockBtn").addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_KEY);
      appRoot.innerHTML = "";
      appRoot.hidden = true;
      document.title = "Private Access Portal";
      document.getElementById("authUser").value = "";
      document.getElementById("authPass").value = "";
      document.getElementById("authError").hidden = true;
      document.getElementById("authGate").hidden = false;
      document.getElementById("authUser").focus();
    });

    // Mobile Drawer
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
    document.querySelectorAll(".nav-item").forEach((link) => {
      link.addEventListener("click", () => sidebar.classList.remove("open"));
    });

    // Hero & Dual Reader
    document.getElementById("heroSubtitle").textContent = DATA.meta.subtitle;
    document.getElementById("statsRow").innerHTML = DATA.meta.stats
      .map(
        (s) => `
        <div class="stat-card">
          <div class="stat-val">${esc(s.value)}</div>
          <div class="stat-lbl">${esc(s.label)}</div>
        </div>`
      )
      .join("");

    document.getElementById("dualReaderGrid").innerHTML = DATA.dualReaderModel
      .map(
        (r) => `
        <div class="info-card">
          <h3 class="card-title">${esc(r.reader)}</h3>
          <p>${esc(r.mechanism)}</p>
          <p class="muted-note"><strong>Operational Rule:</strong> ${esc(r.implication)}</p>
        </div>`
      )
      .join("");

    // 22 Platform Shifts
    let activeRisk = "ALL";
    function renderShifts() {
      const filtered =
        activeRisk === "ALL"
          ? DATA.platformShifts
          : DATA.platformShifts.filter((s) => s.risk === activeRisk);
      document.getElementById("shiftsList").innerHTML = filtered
        .map(
          (s) => `
        <article class="shift-card">
          <div class="shift-head">
            <h3 class="shift-title">#${String(s.id).padStart(2, "0")} — ${esc(s.title)}</h3>
            <span class="badge badge-${esc(s.risk)}">${esc(s.risk)}</span>
          </div>
          <div class="shift-cols">
            <div>
              <span class="shift-col-label">Outdated Habit</span>
              <span>${esc(s.legacyApproach)}</span>
            </div>
            <div>
              <span class="shift-col-label">Current Platform Reality</span>
              <span>${esc(s.modernReality)}</span>
            </div>
            <div>
              <span class="shift-col-label">Required Execution</span>
              <span><strong>${esc(s.actionRule)}</strong></span>
            </div>
          </div>
        </article>`
        )
        .join("");
    }
    renderShifts();

    document.getElementById("riskFilters").addEventListener("click", (e) => {
      const btn = e.target.closest(".pill");
      if (!btn) return;
      document.querySelectorAll("#riskFilters .pill").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      activeRisk = btn.dataset.risk;
      renderShifts();
    });

    // Profile Checklist
    const checkedState = JSON.parse(localStorage.getItem("upw_profile_checks") || "{}");
    function updateMasteryProgress() {
      const total = DATA.profileBlueprint.steps.length;
      const done = DATA.profileBlueprint.steps.filter((s) => checkedState[s.num]).length;
      const pct = Math.round((done / total) * 100);
      document.getElementById("masteryFill").style.width = `${pct}%`;
      document.getElementById("masteryText").textContent = `${done} / ${total} profile steps checked`;
    }

    function renderChecklist() {
      document.getElementById("profileChecklist").innerHTML = DATA.profileBlueprint.steps
        .map((s) => {
          const isChecked = !!checkedState[s.num];
          return `
          <label class="check-item ${isChecked ? "checked" : ""}" data-num="${esc(s.num)}">
            <input type="checkbox" ${isChecked ? "checked" : ""} />
            <div>
              <div class="check-num">STEP ${esc(s.num)}</div>
              <strong>${esc(s.title)}</strong>
              <div class="muted-note">${esc(s.detail)}</div>
            </div>
          </label>`;
        })
        .join("");
      updateMasteryProgress();
    }
    renderChecklist();

    document.getElementById("profileChecklist").addEventListener("change", (e) => {
      const label = e.target.closest(".check-item");
      if (!label) return;
      const num = label.dataset.num;
      checkedState[num] = e.target.checked;
      localStorage.setItem("upw_profile_checks", JSON.stringify(checkedState));
      label.classList.toggle("checked", e.target.checked);
      updateMasteryProgress();
    });

    document.getElementById("portfolioRulesGrid").innerHTML = DATA.profileBlueprint.portfolioRules
      .map(
        (r) => `
        <div class="info-card">
          <h4 class="card-title">${esc(r.rule)}</h4>
          <p class="muted-note">${esc(r.detail)}</p>
        </div>`
      )
      .join("");

    // 7-Gate Vetting Calculator
    const gateStates = {};
    function updateVerdict() {
      const badge = document.getElementById("verdictBadge");
      const summary = document.getElementById("verdictSummary");
      const vals = Object.values(gateStates);
      const failCount = vals.filter((v) => v === "fail").length;
      const passCount = vals.filter((v) => v === "pass").length;

      const criticalFail = DATA.vettingGates.some(
        (g) => g.weight === "CRITICAL" && gateStates[g.id] === "fail"
      );

      badge.className = "verdict-badge";
      if (vals.length === 0) {
        badge.textContent = "EVALUATE GATES";
        summary.textContent = "Toggle the 7 verification gates below to score a prospective client.";
      } else if (criticalFail || failCount >= 2) {
        badge.classList.add("skip");
        badge.textContent = "SKIP — SAVE CONNECTS";
        summary.textContent = "One or more critical red flags detected. Skipping preserves Connects and protects Job Success Score.";
      } else if (failCount === 1) {
        badge.classList.add("caution");
        badge.textContent = "CAUTION — INSPECT DEEPER";
        summary.textContent = "A non-critical warning is present. Proceed only if budget, niche fit, and past review tone are clear.";
      } else if (passCount === DATA.vettingGates.length) {
        badge.classList.add("go");
        badge.textContent = "GO — SNIPER TARGET";
        summary.textContent = "All 7 gates passed. Craft a custom non-templated proposal immediately.";
      } else {
        badge.classList.add("go");
        badge.textContent = `CLEARED SO FAR (${passCount}/${DATA.vettingGates.length})`;
        summary.textContent = "No red flags flagged yet. Complete the remaining checks before spending Connects.";
      }
    }

    function renderGates() {
      document.getElementById("vettingGatesList").innerHTML = DATA.vettingGates
        .map((g) => {
          const st = gateStates[g.id];
          return `
          <div class="gate-row" data-gate="${esc(g.id)}">
            <div>
              <span class="badge badge-${esc(g.weight)}">${esc(g.weight)}</span>
              <div><strong>${esc(g.name)}</strong></div>
            </div>
            <div class="muted-note">
              <div><strong>Pass:</strong> ${esc(g.greenLight)}</div>
              <div><strong>Fail:</strong> ${esc(g.redFlag)}</div>
            </div>
            <div class="gate-toggle-group">
              <button type="button" class="gate-btn pass ${st === "pass" ? "active" : ""}" data-val="pass">Pass</button>
              <button type="button" class="gate-btn fail ${st === "fail" ? "active" : ""}" data-val="fail">Red Flag</button>
            </div>
          </div>`;
        })
        .join("");
      updateVerdict();
    }
    renderGates();

    document.getElementById("vettingGatesList").addEventListener("click", (e) => {
      const btn = e.target.closest(".gate-btn");
      if (!btn) return;
      const row = btn.closest(".gate-row");
      const id = row.dataset.gate;
      const val = btn.dataset.val;
      if (gateStates[id] === val) {
        delete gateStates[id];
      } else {
        gateStates[id] = val;
      }
      renderGates();
    });

    document.getElementById("resetVettingBtn").addEventListener("click", () => {
      Object.keys(gateStates).forEach((k) => delete gateStates[k]);
      renderGates();
    });

    document.getElementById("whalesParadoxCard").innerHTML = `
      <h3 class="card-title">${esc(DATA.whalesParadox.title)}</h3>
      <p class="muted-note">${esc(DATA.whalesParadox.insight)}</p>
    `;

    document.getElementById("timezoneGrid").innerHTML = DATA.timezoneMatrix
      .map(
        (t) => `
        <div class="info-card">
          <h4 class="card-title">${esc(t.region)}</h4>
          <p><strong>Peak Bidding Window:</strong> ${esc(t.peakWindow)}</p>
          <p class="muted-note"><strong>Delivery Edge:</strong> ${esc(t.deliveryEdge)}</p>
          <p class="muted-note" style="margin-top:8px;">${esc(t.notes)}</p>
        </div>`
      )
      .join("");

    document.getElementById("feedMechanicsList").innerHTML = DATA.feedMechanics
      .map((m) => `<li>${esc(m)}</li>`)
      .join("");

    // 8 Archetypes
    document.getElementById("archetypesGrid").innerHTML = DATA.clientArchetypes
      .map(
        (a) => `
        <article class="archetype-card">
          <div class="archetype-top">
            <span class="badge badge-neutral">${esc(a.code)}</span>
            <span class="muted-note">${esc(a.share)}</span>
          </div>
          <h3 class="card-title">${esc(a.name)}</h3>
          <p class="muted-note"><strong>Profile:</strong> ${esc(a.profile)}</p>
          <p class="muted-note"><strong>Dislikes:</strong> ${esc(a.hates)}</p>
          <p class="muted-note"><strong>Converts On:</strong> ${esc(a.convertsOn)}</p>
          <div class="hook-box"><strong>Sample Hook:</strong>\n${esc(a.sampleHook)}</div>
        </article>`
      )
      .join("");

    // 16 Job Signals Decoder
    function renderDecoder(query = "") {
      const q = query.trim().toLowerCase();
      const list = q
        ? DATA.jobDecoder.filter(
            (d) =>
              d.signal.toLowerCase().includes(q) ||
              d.hiddenPain.toLowerCase().includes(q) ||
              d.response.toLowerCase().includes(q)
          )
        : DATA.jobDecoder;
      document.getElementById("decoderList").innerHTML = list.length
        ? list
            .map(
              (d, i) => `
          <div class="decoder-row">
            <div class="decoder-signal">#${String(i + 1).padStart(2, "0")} ${esc(d.signal)}</div>
            <div class="muted-note"><strong>Hidden Pain:</strong> ${esc(d.hiddenPain)}</div>
            <div><strong>Tactical Response:</strong> ${esc(d.response)}</div>
          </div>`
            )
            .join("")
        : `<div class="info-card">No matching job post signals found.</div>`;
    }
    renderDecoder();
    document.getElementById("decoderFilter").addEventListener("input", (e) => renderDecoder(e.target.value));

    // Iron Laws
    document.getElementById("ironLawsGrid").innerHTML = DATA.ironLaws
      .map(
        (l) => `
        <div class="info-card">
          <h3 class="card-title">${esc(l.law)}</h3>
          <p class="muted-note">${esc(l.detail)}</p>
        </div>`
      )
      .join("");

    // Live Proposal Linter
    const linterInput = document.getElementById("linterInput");
    const hasScreeningToggle = document.getElementById("hasScreeningToggle");

    function runLinter() {
      const raw = linterInput.value;
      const trimmed = raw.trim();
      const screeningMode = hasScreeningToggle.checked;

      const firstLine = (trimmed.split(/\n/)[0] || "").trim();
      const firstSentence = (trimmed.split(/(?<=[.!?])\s+/)[0] || firstLine).trim();
      const previewChars = Math.min(firstLine.length, firstSentence.length || firstLine.length);
      const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

      const minW = screeningMode ? 25 : 45;
      const maxW = screeningMode ? 60 : 115;

      document.getElementById("linterMetrics").innerHTML = `
        <span class="metric-chip">Words: ${words} (Target ${minW}–${maxW})</span>
        <span class="metric-chip">Opening Sentence: ${firstSentence.length} chars (Preview limit ~150)</span>
        <span class="metric-chip">Line 1: ${firstLine.length} chars</span>
      `;

      if (!trimmed) {
        document.getElementById("linterChecks").innerHTML =
          `<div class="lint-item">Awaiting proposal draft text.</div>`;
        return;
      }

      const checks = [];

      const greetingRe = /^(hi|hello|hey|greetings|dear\s+hiring|good\s+(morning|afternoon|evening)|i\s+hope\s+this|my\s+name\s+is|i\s+am\s+a\s+|i'm\s+a\s+)/i;
      const bioRe = /\b(years?\s+of\s+experience|passionate\s+video\s+editor|carefully\s+read\s+your)\b/i;
      if (greetingRe.test(trimmed) || bioRe.test(trimmed)) {
        checks.push({
          cls: "fail",
          msg: "Greeting or Bio Detected: Opening lines contain generic greetings or self-introductions that waste the 150-char preview."
        });
      } else {
        checks.push({ cls: "ok", msg: "Zero Greeting / Bio: Opens directly with substance." });
      }

      if (previewChars > 160) {
        checks.push({
          cls: "warn",
          msg: `Opening Exceeds Preview (${previewChars} chars): Tighten Sentence 1 under 150 characters so the core hook stays visible.`
        });
      } else {
        checks.push({ cls: "ok", msg: `Preview Hook Fit (${previewChars} chars): Fits inside the ~150-character client preview.` });
      }

      if (words < minW || words > maxW) {
        checks.push({
          cls: "warn",
          msg: `Word Count (${words}): Outside recommended ${minW}–${maxW} word window${screeningMode ? " for screening-question posts" : ""}.`
        });
      } else {
        checks.push({ cls: "ok", msg: `Word Budget Optimal (${words} words): Concise and mobile-scannable.` });
      }

      const lower = trimmed.toLowerCase();
      const foundSlop = DATA.bannedWords.filter((w) => {
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`, "i").test(lower);
      });
      if (foundSlop.length > 0) {
        checks.push({
          cls: "fail",
          msg: `Banned AI-Slop Terms Found: ${foundSlop.join(", ")}. Replace with concrete editing nouns.`
        });
      } else {
        checks.push({ cls: "ok", msg: "Vocabulary Clean: Zero banned AI clichés detected." });
      }

      const socialLinkRe = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|t\.me|telegram\.me|wa\.me|facebook\.com)/i;
      if (socialLinkRe.test(trimmed)) {
        checks.push({
          cls: "fail",
          msg: "Policy Ban Risk: External social media or messaging links detected inside proposal text."
        });
      } else {
        checks.push({ cls: "ok", msg: "Link Hygiene Passed: No risky external social URLs found." });
      }

      if (/\b(easy\s+task|simple\s+task|very\s+simple|super\s+easy)\b/i.test(trimmed)) {
        checks.push({
          cls: "warn",
          msg: "Value Erosion Risk: Calling a creative brief 'easy' or 'simple' lowers perceived value."
        });
      } else if (/\b(as\s+soon\s+as\s+possible|shortest\s+time)\b/i.test(trimmed)) {
        checks.push({
          cls: "warn",
          msg: "Vague Speed Claim: Replace 'as soon as possible' with an exact hour commitment (e.g., 'within 2 hours')."
        });
      } else {
        checks.push({ cls: "ok", msg: "Value Framing Solid: No self-devaluation or vague timing phrases." });
      }

      document.getElementById("linterChecks").innerHTML = checks
        .map((c) => `<div class="lint-item ${c.cls}">${esc(c.msg)}</div>`)
        .join("");
    }

    linterInput.addEventListener("input", runLinter);
    hasScreeningToggle.addEventListener("change", runLinter);
    document.getElementById("loadSampleDraftBtn").addEventListener("click", () => {
      linterInput.value = DATA.proposals[0].text;
      runLinter();
    });
    runLinter();

    // Fixed vs Hourly Table
    document.getElementById("fixedHourlyTable").innerHTML = `
      <thead>
        <tr>
          <th>Criterion</th>
          <th>Fixed-Price Proposals</th>
          <th>Hourly Proposals</th>
        </tr>
      </thead>
      <tbody>
        ${DATA.fixedVsHourly
          .map(
            (row) => `
          <tr>
            <td><strong>${esc(row.criterion)}</strong></td>
            <td>${esc(row.fixed)}</td>
            <td>${esc(row.hourly)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    `;

    // 15 Proposal Blueprints
    let activePType = "ALL";
    function renderProposals() {
      const list =
        activePType === "ALL"
          ? DATA.proposals
          : DATA.proposals.filter((p) => p.budget.toLowerCase().includes(activePType.toLowerCase()));
      document.getElementById("proposalsGrid").innerHTML = list
        .map((p) => {
          const wCount = p.text.trim().split(/\s+/).length;
          const line1Chars = p.text.split("\n")[0].length;
          return `
          <article class="proposal-card">
            <div class="proposal-header">
              <div>
                <span class="badge badge-neutral">${esc(p.id)} · ${esc(p.tag)}</span>
                <div class="muted-note" style="margin-top:4px;"><strong>${esc(p.budget)}</strong> — ${esc(p.context)}</div>
              </div>
            </div>
            <div class="proposal-body">${esc(p.text)}</div>
            <div class="muted-note"><strong>Mechanism:</strong> ${esc(p.whyItWorks)}</div>
            <div class="proposal-footer">
              <span class="metric-chip">${wCount}w · L1 ${line1Chars}c</span>
              <button class="copy-btn" data-copy-proposal="${esc(p.id)}">Copy Template</button>
            </div>
          </article>`;
        })
        .join("");
    }
    renderProposals();

    document.getElementById("proposalFilters").addEventListener("click", (e) => {
      const btn = e.target.closest(".pill");
      if (!btn) return;
      document.querySelectorAll("#proposalFilters .pill").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      activePType = btn.dataset.ptype;
      renderProposals();
    });

    document.getElementById("proposalsGrid").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy-proposal]");
      if (!btn) return;
      const item = DATA.proposals.find((p) => p.id === btn.dataset.copyProposal);
      if (item) copyText(item.text, item.id);
    });

    // 17 Secrets Vault
    document.getElementById("secretsGrid").innerHTML = DATA.secretsVault
      .map(
        (s) => `
        <article class="secret-card">
          <div class="secret-num">EDGE #${esc(s.num)}</div>
          <h3 class="card-title">${esc(s.title)}</h3>
          <p class="muted-note">${esc(s.detail)}</p>
        </article>`
      )
      .join("");

    // Closing & Delivery
    document.getElementById("interviewProtocolList").innerHTML = DATA.closingAndDelivery.interviewProtocol
      .map((item) => `<li>${esc(item)}</li>`)
      .join("");

    document.getElementById("escrowRulesList").innerHTML = DATA.closingAndDelivery.escrowAndGhostRules
      .map((item) => `<li>${esc(item)}</li>`)
      .join("");

    document.getElementById("operationalScriptsList").innerHTML = DATA.closingAndDelivery.operationalScripts
      .map(
        (sc, idx) => `
        <article class="script-card">
          <div class="script-head">
            <div>
              <h4 class="card-title">${esc(sc.title)}</h4>
              <p class="muted-note">${esc(sc.useCase)}</p>
            </div>
            <button class="copy-btn" data-copy-script="${idx}">Copy Script</button>
          </div>
          <pre class="script-pre">${esc(sc.script)}</pre>
        </article>`
      )
      .join("");

    document.getElementById("operationalScriptsList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy-script]");
      if (!btn) return;
      const sc = DATA.closingAndDelivery.operationalScripts[Number(btn.dataset.copyScript)];
      if (sc) copyText(sc.script, sc.title);
    });

    // Tech Specs & Master Prompt
    document.getElementById("techSpecsGrid").innerHTML = DATA.techSpecs
      .map(
        (cat) => `
        <div class="info-card">
          <h3 class="card-title">${esc(cat.category)}</h3>
          <ul class="ordered-list" style="padding-left:18px;">
            ${cat.items.map((it) => `<li>${esc(it)}</li>`).join("")}
          </ul>
        </div>`
      )
      .join("");

    const masterPromptPre = document.getElementById("masterPromptPre");
    masterPromptPre.textContent = DATA.aiStrategistPrompt;
    document.getElementById("copyMasterPromptBtn").addEventListener("click", () => {
      copyText(DATA.aiStrategistPrompt, "Master AI Strategist Prompt");
    });

    // Global Search
    const searchIndex = [];
    DATA.platformShifts.forEach((s) =>
      searchIndex.push({
        section: "#shifts",
        kind: "Platform Shift",
        title: `#${s.id} ${s.title}`,
        body: `${s.legacyApproach} ${s.modernReality} ${s.actionRule}`
      })
    );
    DATA.clientArchetypes.forEach((a) =>
      searchIndex.push({
        section: "#archetypes",
        kind: "Client Archetype",
        title: `${a.code} — ${a.name}`,
        body: `${a.profile} ${a.hates} ${a.convertsOn}`
      })
    );
    DATA.jobDecoder.forEach((d) =>
      searchIndex.push({
        section: "#decoder",
        kind: "Job Signal",
        title: d.signal,
        body: `${d.hiddenPain} ${d.response}`
      })
    );
    DATA.proposals.forEach((p) =>
      searchIndex.push({
        section: "#proposals",
        kind: "Proposal Blueprint",
        title: `${p.id} (${p.tag}) — ${p.budget}`,
        body: `${p.context} ${p.text} ${p.whyItWorks}`
      })
    );
    DATA.secretsVault.forEach((s) =>
      searchIndex.push({
        section: "#secrets",
        kind: "Hidden Edge",
        title: `#${s.num} ${s.title}`,
        body: s.detail
      })
    );
    DATA.closingAndDelivery.operationalScripts.forEach((sc) =>
      searchIndex.push({
        section: "#closing",
        kind: "Chat Script",
        title: sc.title,
        body: `${sc.useCase} ${sc.script}`
      })
    );
    DATA.techSpecs.forEach((t) =>
      searchIndex.push({
        section: "#specs",
        kind: "Tech Spec",
        title: t.category,
        body: t.items.join(" ")
      })
    );

    const searchInput = document.getElementById("globalSearch");
    const searchClear = document.getElementById("searchClear");
    const searchPanel = document.getElementById("searchResultsPanel");
    const searchList = document.getElementById("searchResultsList");
    const searchHeading = document.getElementById("searchResultsHeading");

    function runGlobalSearch() {
      const q = searchInput.value.trim().toLowerCase();
      searchClear.hidden = !q;
      if (!q) {
        searchPanel.hidden = true;
        return;
      }
      const hits = searchIndex
        .filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.body.toLowerCase().includes(q) ||
            item.kind.toLowerCase().includes(q)
        )
        .slice(0, 20);

      searchPanel.hidden = false;
      searchHeading.textContent = `Search Results (${hits.length} match${hits.length === 1 ? "" : "es"})`;
      searchList.innerHTML = hits.length
        ? hits
            .map(
              (h) => `
          <a href="${esc(h.section)}" class="search-hit">
            <span class="badge badge-neutral">${esc(h.kind)}</span>
            <div><strong>${esc(h.title)}</strong></div>
            <div class="muted-note">${esc(h.body.slice(0, 200))}${h.body.length > 200 ? "..." : ""}</div>
          </a>`
            )
            .join("")
        : `<div class="muted-note">No matching playbook entries found for "${esc(searchInput.value)}".</div>`;
    }

    searchInput.addEventListener("input", runGlobalSearch);
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      runGlobalSearch();
    });
    document.getElementById("closeSearchResults").addEventListener("click", () => {
      searchPanel.hidden = true;
    });
    searchList.addEventListener("click", () => {
      searchPanel.hidden = true;
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInput.focus();
      }
    });

    // ScrollSpy
    const sections = Array.from(document.querySelectorAll("main .section"));
    const navItems = Array.from(document.querySelectorAll(".nav-item"));
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              navItems.forEach((n) => n.classList.toggle("active", n.dataset.section === id));
            }
          });
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      sections.forEach((s) => obs.observe(s));
    }
  }

  // Auth Gate Controller
  const authForm = document.getElementById("authForm");
  const authUser = document.getElementById("authUser");
  const authPass = document.getElementById("authPass");
  const authError = document.getElementById("authError");
  const authSubmitBtn = document.getElementById("authSubmitBtn");

  // Restore active tab session if already unlocked in this tab
  const cachedJson = sessionStorage.getItem(SESSION_KEY);
  if (cachedJson) {
    try {
      const parsed = JSON.parse(cachedJson);
      initPlaybookApp(parsed);
    } catch (_) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authError.hidden = true;
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = "Decrypting...";
    try {
      const data = await decryptVault(authUser.value, authPass.value);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
      initPlaybookApp(data);
    } catch (_) {
      authError.textContent = "Invalid login or password.";
      authError.hidden = false;
      authPass.value = "";
      authPass.focus();
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = "Unlock Dossier";
    }
  });
})();
