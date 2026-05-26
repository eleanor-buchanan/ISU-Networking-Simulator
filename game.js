// 1. Create the music object
const bgMusic = new Audio('spacejazz.mp3');
const fanfareSound = new Audio('fanfare.mp3'); // Ensure this matches your filename!

// 2. Set properties
bgMusic.loop = true;      // Makes it repeat forever
bgMusic.volume = 0.15;    // Background music should usually be quieter than SFX (15% volume)
fanfareSound.volume = 0.4; // Fanfare should be a bit louder for the reward

// 3. Create a function to start the music
function startMusic() {
  bgMusic.play().catch(e => {
    // This handles the browser blocking autoplay
    console.log("Music playback waited for user interaction.");
  });
}

// 1. Create the audio object
const clickSound = new Audio('click.mp3');

// Set volume to 20% (Adjust this number to find your sweet spot)
clickSound.volume = 0.2; 

// 2. Function to play the sound
function playClick() {
  clickSound.currentTime = 0; // Resets the sound to the start (so you can click fast)
  clickSound.play().catch(e => console.log("Audio playback failed:", e));
}

// 3. The Global Listener
// This monitors the whole document for clicks. If the thing clicked is a button, it plays.
document.addEventListener('click', function (e) {
  if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
    playClick();
  }
});



/** GAME STATE **/
let score = 0;
let sips = 0;
let outfitBonus = 0;
let currentNPCKey = "";
let story = null;

/** LOAD DIALOGUE FROM JSON **/
async function loadStory() {
  try {
    const response = await fetch('story.json');
    story = await response.json();
    console.log("System: Story files loaded successfully.");
  } catch (error) {
    console.error("System Error: Failed to load story.json. Ensure you are running a local server.", error);
  }
}

/** CORE ENGINE **/
function showScreen(id) {
  document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function beginAdventure() {
  // 1. Start the music loop
  startMusic();
  
  // 2. Hide the pre-start overlay
  document.getElementById('screen-pre-start').style.display = 'none';
  
  // 3. Show the actual title screen
  showScreen('screen-start');
  
  // 4. Mark music as started so showScreen doesn't try to trigger it again
  musicStarted = true;
}

const outfits = [
  { desc: "Navy blazer, light blue button-up shirt, khaki chinos, brown loafers", pts: 40 },
  { desc: "Tailored black suit, white dress shirt, black dress shoes", pts: 50 },
  { desc: "Gray zip hoodie, dark jeans, vintage Garfield T-shirt, black sneakers", pts: 0 },
  { desc: "Oversized beige hoodie, cargo pants, chunky sneakers, silver chain necklace, flat rim cap", pts: 10 },
  { desc: "Black velvet tuxedo jacket, satin lapels, pocket square, patent leather shoes, gold cufflinks.", pts: 10 },
  { desc: "Pink pajama shorts that say JUICY on the butt, oversized vintage Garfield T-shirt, Uggs", pts: -30 },
  { desc: "Black leggings, crop-top hoodie, white sneakers", pts: 0 },
  { desc: "Floor-length red silk gown with slit, opera gloves, diamond necklace, metallic high heels", pts: 10 },
  { desc: "High-waisted jeans, tucked white T-shirt, denim jacket, canvas sneakers", pts: 20 },
  { desc: "Cream turtleneck sweater, plaid skirt, sheer tights, ankle boots", pts: 30 },
  { desc: "Jeans and t-shirt with a nice blazer on top", pts: 30 },
  { desc: "Satin dark green cocktail dress, silver earrings, matching clutch purse, strappy heels", pts: 40 },
  { desc: "Inflatable dinosaur costume", pts: -40 },
  { desc: "Blue plaid pajama pants, white undershirt, gray bathrobe, bare feet", pts: -20 },
  { desc: "Lakers basketball uniform", pts: -20 },
  { desc: "Nothing", pts: -60 },
];

// Replace your old "Initialize Outfits" loop with this:
const outfitGrid = document.getElementById('outfit-grid');
if (outfitGrid) {
  outfits.forEach(outfit => {
    const div = document.createElement('div');
    div.className = 'grid-item';
    
    // Display description and point value
    div.innerHTML = `
      <div class="outfit-desc">${outfit.desc}</div>
    `;
    
    div.onclick = () => {
      document.querySelectorAll('.grid-item').forEach(s => s.classList.remove('selected'));
      div.classList.add('selected');
      outfitBonus = outfit.pts; // Sets the starting score bonus
      document.getElementById('enter-hall-btn').disabled = false;
    };
    outfitGrid.appendChild(div);
  });
}

function enterHall() {
  score += outfitBonus;
  updateScoreDisplays();
  showScreen('screen-hall');
}

function openDarius() {
  if (!story || !story.prologue) {
    console.error("Story not fully loaded yet");
    return;
  }
  currentNPCKey = "darius";
  document.getElementById('window-darius').classList.add('active');
  if (document.getElementById('log-darius').innerHTML === "") {
    startDialogue("DariusStart", story.prologue);
  }
}

function startDialogue(nodeId, dataSet) {
  const node = dataSet[nodeId];
  if (!node) {
    console.error("Node not found:", nodeId);
    return;
  }

  if (node.expo) addLogEntry(currentNPCKey, "NARRATIVE", node.expo);
  
  const dialogueText = node.text || node.t || "...";
  
  // --- CHANGE THIS PART ---
  let label = currentNPCKey.toUpperCase(); 
  if (label === "MEIR") label = "BENNET"; // This forces the label to say BENNET
  // -------------------------

  addLogEntry(currentNPCKey, label, dialogueText);
  
  renderChoices(node.choices || node.c, dataSet);
}

function renderChoices(choices, dataSet) {
  const targetId = `choices-${currentNPCKey}`;
  const area = document.getElementById(targetId);

  // --- START FIX ---
  // This 'if' statement prevents the 'null' crash.
  if (!area) {
    console.error(`SYSTEM ERROR: The code is looking for <div id="${targetId}"> but cannot find it in index.html.`);
    console.log(`Current NPC Key is: "${currentNPCKey}"`);
    return; // Stops the function safely
  }
  // --- END FIX ---

  area.innerHTML = "";

  if (!choices) return;

  choices.forEach(c => {
    // Hide DrunkText if sober
    if (c.isDrunk && sips < 5) return;

    const btn = document.createElement('button');
    btn.className = "btn-90s";
    btn.textContent = c.text;
    btn.onclick = () => handleDecision(c, dataSet);
    area.appendChild(btn);
  });
}

function handleDecision(choice, dataSet) {
  // 1. Log the player's choice immediately
  addLogEntry(currentNPCKey, "YOU", choice.text);

  // 2. Hide buttons and show processing message immediately
  const choiceArea = document.getElementById(`choices-${currentNPCKey}`);
  if (choiceArea) {
    choiceArea.innerHTML = "<i>[SYSTEM: PROCESSING RESPONSE...]</i>";
  }

  // 3. Start the delay
  setTimeout(() => {
    // A. Handle Scoring
    const pointsAwarded = (choice.pts !== undefined) ? choice.pts : (choice.PointValue || 0);
    score += pointsAwarded;
    updateScoreDisplays(pointsAwarded);

    // B. Handle Wine Activation
    if (choice.getWine) {
      const wineBtn = document.getElementById('sip-btn-global');
      if (wineBtn) wineBtn.style.visibility = "visible";
    }

    // C. Check for Minigame Intercept
    const minigameTriggers = ["Jess16", "Jess17", "Jess18"];
    if (minigameTriggers.includes(choice.next)) {
      startProxemicsMinigame(choice.next, dataSet);
      return; // Exit the timeout function
    }

    // D. Check for Endings
    if (story.endings && story.endings[choice.next]) {
      triggerResult(choice.next);
      return; // Exit the timeout function
    }

    // E. Handle Special Unlock Transition (Darius to Bennet)
    if (choice.next === "UNLOCK_BENNET") {
      document.getElementById('window-darius').classList.remove('active');
      const row = document.getElementById('row-meir');
      if (row) {
        row.classList.remove('locked');
        document.getElementById('meir-desc').textContent = "(Stranger: standing in the middle of the room in a group)";
        row.onclick = () => {
          currentNPCKey = "meir";
          document.getElementById('window-meir').classList.add('active');
          // Resuming with the Jess data block
          startDialogue("Start", story.prologue.jess); 
        };
      }
      showScreen('screen-hall');
      return;
    }

    // F. Default: Progress to the next dialogue node
    startDialogue(choice.next, dataSet);

  }, 800); // 800ms is the perfect "human-like" pause
}

function addLogEntry(char, name, text) {
  const container = document.getElementById(`log-${char}`);
  if (!container) return;

  while (container.children.length >= 8) {
    container.removeChild(container.firstChild);
  }

  const div = document.createElement('div');
  if (name === "NARRATIVE") {
    div.className = "log-narrative";
    div.innerHTML = text;
  } else {
    div.className = "log-entry";
    div.innerHTML = `<span class="log-${char}">[${name}]</span>: ${text}`;
  }
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function takeSip() {
  sips += 1;
  const fill = document.getElementById('intox-fill');
  const percent = Math.min((sips / 50) * 100, 100);
  fill.style.width = percent + "%";
  document.getElementById('sip-count').textContent = sips;

  if (sips > 35) fill.style.background = "#ff0000";
  else if (sips > 10) fill.style.background = "#ffff00";

  if (sips > 50) triggerResult("Hammered Ending");
}

function updateScoreDisplays(change = 0) {
  const s = Math.floor(score);
  
   // Update all possible score IDs
  ["hall-score", "current-score", "darius-score"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = s;
  });

  // If points were changed, show the floating text
  if (change !== 0) {
    showPointPopup(change);
  }
}

function showPointPopup(amount) {
  // 1. Find the score element in the window that is currently visible
  const activeScore = document.querySelector('.window.active span[id$="-score"]');
  if (!activeScore) return;

  // 2. Create the popup element
  const popup = document.createElement('span');
  popup.className = `point-popup ${amount > 0 ? 'pts-green' : 'pts-red'}`;
  popup.textContent = (amount > 0 ? "+" : "") + amount;

  // 3. Put the popup inside the relative-positioned span we made in HTML
  activeScore.parentElement.appendChild(popup);

  // 4. Remove after animation
  setTimeout(() => {
    popup.remove();
  }, 2000);
}

function triggerResult(endingKey) {
  const data = story.endings[endingKey];
  showScreen('screen-result');
  document.getElementById('res-header').textContent = data.title;
  document.getElementById('res-text').textContent = data.message;
  document.getElementById('res-score').textContent = Math.floor(score);
}

// Initialization
loadStory();
/** PROCEDURAL STARFIELD **/
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

let stars = [];
const numStars = 400;

// Resize canvas to fit screen
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Generate stars with random positions and sizes
function createStars() {
  stars = [];
  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5,
      opacity: Math.random(),
      speed: Math.random() * 0.02 + 0.005 // Twinkle speed
    });
  }
}

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  stars.forEach(star => {
    // Make them twinkle by oscillating opacity
    star.opacity += star.speed;
    if (star.opacity > 1 || star.opacity < 0) star.speed *= -1;

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(star.opacity)})`;
    ctx.fill();
  });

  requestAnimationFrame(drawStars);
}

// Initialize the background
window.addEventListener('resize', () => {
  resizeCanvas();
  createStars();
});

resizeCanvas();
createStars();
drawStars();

function openSettings() {
    document.getElementById('window-settings').classList.add('active');
}

function closeSettings() {
    document.getElementById('window-settings').classList.remove('active');
}

function openCredits() {
    document.getElementById('window-credits').classList.add('active');
}

function closeCredits() {
    document.getElementById('window-credits').classList.remove('active');
}

function changeVolume(val) {
    // val is 0 to 100, bgMusic.volume needs 0.0 to 1.0
    const newVol = val / 100;
    bgMusic.volume = newVol;
    
    // Update the number text on the screen
    document.getElementById('vol-value').textContent = val;
}
let isHardMode = false;
const hardOverlay = document.getElementById('hard-mode-overlay');

function toggleHardMode() {
  const overlay = document.getElementById('hard-mode-overlay');
  const btn = document.getElementById('btn-hard-mode'); // Find the button
  
  if (!overlay) return;

  isHardMode = !isHardMode;
  
  if (isHardMode) {
    overlay.style.display = 'block';
    document.addEventListener('mousemove', moveSpotlight);
    
    // CHANGE THE TEXT HERE
    if (btn) btn.textContent = "wait no I don't like that";

    // Visual feedback
    if (btn) {
        btn.style.backgroundColor = "#000000";
        btn.style.color = "#ff0000";
    }
  } else {
    overlay.style.display = 'none';
    document.removeEventListener('mousemove', moveSpotlight);
    
    // REVERT THE TEXT HERE
    if (btn) btn.textContent = "HARD MODE";
    
    if (btn) {
        btn.style.backgroundColor = "#000";
        btn.style.color = "#ff0000";
    }
  }
}

function moveSpotlight(e) {
  // Update the radial gradient position based on cursor X and Y
  const x = e.clientX;
  const y = e.clientY;
  
  hardOverlay.style.background = `radial-gradient(circle 150px at ${x}px ${y}px, transparent 0%, rgba(0, 0, 0, 0.98) 100%)`;
}

const dreamloKey = "ewWw7gW7kkeVGaorl8-78ARVTAFjp1Gkayywr4_3I6EQ";
const dreamloBaseUrl = `http://dreamlo.com/lb/${dreamloKey}`;
// NEW FASTER PROXY
const proxyUrl = "https://corsproxy.io/?";

function openLeaderboard() {
    document.getElementById('window-leaderboard').classList.add('active');
    document.getElementById('high-scores-list').innerHTML = "FETCHING_SATELLITE_DATA...";
    document.getElementById('low-scores-list').innerHTML = "FETCHING_SATELLITE_DATA...";
    fetchGlobalScores();
}

function closeLeaderboard() {
    document.getElementById('window-leaderboard').classList.remove('active');
}


async function saveToDreamlo(nickname, scoreVal, endingTitle) {
    const name = encodeURIComponent(nickname);
    const extra = encodeURIComponent(endingTitle);
    
    const dreamloUrl = `${dreamloBaseUrl}/add/${name}/${scoreVal}/0/${extra}`;
    const finalUrl = `${proxyUrl}${encodeURIComponent(dreamloUrl)}`;

    try {
        await fetch(finalUrl);
        console.log("Archive update successful.");
    } catch (e) {
        console.error("Uplink failed.", e);
    }
}

async function fetchGlobalScores() {
    const highList = document.getElementById('high-scores-list');
    const lowList = document.getElementById('low-scores-list');

    try {
        // Use the new proxy - notice we just tack the URL on the end
        const url = `${proxyUrl}${encodeURIComponent(dreamloBaseUrl + "/json?cb=" + Date.now())}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        if (!data.dreamlo || !data.dreamlo.leaderboard || !data.dreamlo.leaderboard.entry) {
            highList.innerHTML = "<p>NO_DATA_ARCHIVED</p>";
            lowList.innerHTML = "<p>NO_DATA_ARCHIVED</p>";
            return;
        }

        let entries = data.dreamlo.leaderboard.entry;
        if (!Array.isArray(entries)) entries = [entries];

        const top10 = [...entries].sort((a, b) => parseInt(b.score) - parseInt(a.score)).slice(0, 10);
        const bottom10 = [...entries].sort((a, b) => parseInt(a.score) - parseInt(b.score)).slice(0, 10);

        const renderEntry = (s, color) => {
            const pName = s.name ? decodeURIComponent(s.name) : "Unknown_User";
            const pText = s.text ? decodeURIComponent(s.text) : "Unknown_Outcome";
            const pScore = s.score || 0;
            return `
                <div class="score-entry">
                    <span class="score-val" style="color:${color}">${pScore}</span> - <b style="color:white;">${pName}</b><br>
                    <small style="color: #ccddee;">Result: ${pText}</small>
                </div>
            `;
        };

        highList.innerHTML = top10.map(s => renderEntry(s, "#00ff00")).join('');
        lowList.innerHTML = bottom10.map(s => renderEntry(s, "#ff0000")).join('');

    } catch (e) {
        console.error("Uplink error:", e);
        highList.innerHTML = "<p>UPLINK_OFFLINE<br>TRY_AGAIN_LATER</p>";
        lowList.innerHTML = "<p>UPLINK_OFFLINE<br>TRY_AGAIN_LATER</p>";
    }
}

// 3. Main Ending Trigger (Cleaned up to pass data properly)
function triggerResult(endingKey) {
    const endingData = story.endings[endingKey];
    const title = endingData ? endingData.title : "Unknown Ending";
    const message = endingData ? endingData.message : "The simulation ended unexpectedly.";

    let nickname = prompt(`[${title.toUpperCase()}] reached. Enter name:`, "Anonymous");
    
    if (nickname !== null) {
        if (nickname.trim() === "") nickname = "Anonymous";
        saveToDreamlo(nickname, Math.floor(score), title);
    }

    showScreen('screen-result');
    document.getElementById('res-header').textContent = title;
    document.getElementById('res-text').textContent = message;
    document.getElementById('res-score').textContent = Math.floor(score);
}

/** 
 * PROXEMICS CONFIGURATION
 * Edit X and Y (0-100) to move people/slots manually.
 */
const proxemicsConfig = {
    bennet: { x: 32, y: 53 }, // Focal point on the left side
    others: [
        { x: 49, y: 30 }, // NPC 1 (Top arm of the U)
        { x: 62, y: 50 }, // NPC 2 (Back of the U)
        { x: 50, y: 68 }  // NPC 3 (Bottom arm of the U)
    ],
    slots: [
        { x: 70, y: 69, pts: -15, msg: "Terrible. You are not in the circle, and it feels awkward for the people in the circle to have to shout to you all the way out there. Get WAY closer!" },
        { x: 46, y: 50, pts: -10,  msg: "No. You're in the middle of the circle. This is rude to the people standing behind you. Get out of there, diva!" },
        { x: 35, y: 31, pts: 15, msg: "Good! You're next to her in the circle without being too close to her. Might want to give your friend on the right a little room, but they are also obligated to accommodate you slightly and make the space themselves." },
        { x: 37, y: 67, pts: -5, msg: "Not great. Optimal for getting her attention, but you're inside the personal space bubbles of both Dr. Bennet and your friend to the right. Back up a little." },
        { x: 61, y: 36, pts: 10,  msg: "Not bad; you're successfully inside of the circle. You're a little far from Dr. Bennet for a more personal conversation, but that's okay." }
    ]
};

let pendingDestinationID = "";
let pendingDataSet = null;

function startProxemicsMinigame(destinationID, currentDataSet) {
    const win = document.getElementById('window-proxemics');
    const container = document.getElementById('proxemics-map-container');
    const feedback = document.getElementById('proxemics-feedback');
    
    // ADD THIS LINE: It tells the script to find the button in your HTML
    const contBtn = document.getElementById('proxemics-continue-btn');

    pendingDestinationID = destinationID;
    pendingDataSet = currentDataSet;
    
    win.classList.add('active');
    container.innerHTML = ""; 
    
    if (feedback) {
        feedback.textContent = "Select an appropriate position to have a conversation with Dr. Bennet. Avoid overcrowding her or standing too far away.";
        feedback.style.color = "#000";
    }

    // Hide the continue button at the start
    if (contBtn) contBtn.style.display = "none"; 

    // 1. Draw Dr. Bennet
    drawStaticCircle(container, proxemicsConfig.bennet.x, proxemicsConfig.bennet.y, "circle-ent bennet-static");

    // 2. Draw Other NPCs
    proxemicsConfig.others.forEach(pos => {
        drawStaticCircle(container, pos.x, pos.y, "circle-ent npc-static");
    });

    // 3. Draw Player Click Slots
    proxemicsConfig.slots.forEach(s => {
        const slot = drawStaticCircle(container, s.x, s.y, "circle-ent player-slot");
        
        slot.onclick = () => {
            score += s.pts;
            updateScoreDisplays(s.pts);
            
            if (feedback) {
                feedback.textContent = s.msg;
                feedback.style.color = s.pts > 0 ? "#009d00" : "#cc0000";
            }

            // Disable further clicks
            document.querySelectorAll('.player-slot').forEach(el => el.style.pointerEvents = 'none');
            
            // Show the button we defined at the start
            if (contBtn) contBtn.style.display = "block"; 
        };
    });
}

function finishProxemics() {
    const win = document.getElementById('window-proxemics');
    win.classList.remove('active');
    
    // Now resume the dialogue exactly where we left off
    startDialogue(pendingDestinationID, pendingDataSet);
}


// Simple function to draw the circles
function drawStaticCircle(parent, x, y, className) {
    const div = document.createElement('div');
    div.className = className;
    div.style.left = x + "%";
    div.style.top = y + "%";
    parent.appendChild(div);
    return div;
}

/** SECRET LOGO EASTER EGG **/
let logoClicks = 0;
let logoTimer;

function handleLogoSecret() {
    logoClicks++;
    
    // Clear the timer every time a new click happens
    clearTimeout(logoTimer);

    if (logoClicks === 3) {
        const linkBox = document.getElementById('secret-link-box');
        if (linkBox) {
            // 1. Show the secret container
            linkBox.style.display = 'block';
            console.log("SYSTEM: Dialogue map decrypted. Access granted.");

            // 2. Audio Logic: Temporarily dip the background music
            const originalVol = bgMusic.volume;
            bgMusic.volume = originalVol * 0.2; // Dip to 20% of current setting

            // 3. Play the specific fanfare file
            fanfareSound.currentTime = 0; // Reset to start in case they click it again later
            fanfareSound.play().catch(e => console.error("Audio error:", e));

            // 4. Restore original volume when the fanfare finishes
            fanfareSound.onended = () => {
                bgMusic.volume = originalVol;
            };
        }
        logoClicks = 0; // Reset for next time
    } else {
        // Reset the count if they stop clicking for more than 1.2 seconds
        logoTimer = setTimeout(() => {
            logoClicks = 0;
        }, 1200);
    }
}