document.addEventListener('DOMContentLoaded', () => {
    // === Views ===
    const libraryView = document.getElementById('library-view');
    const simulatorView = document.getElementById('simulator-view');

    // === Library Elements ===
    const presetGrid = document.getElementById('preset-grid');
    const presetStats = document.getElementById('preset-stats');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortSelect = document.getElementById('sort-select');

    // === Simulator Elements ===
    const btnBack = document.getElementById('btn-back');
    const simTitle = document.getElementById('sim-title');
    const simDesc = document.getElementById('sim-desc');
    const svgEdges = document.getElementById('svg-edges');
    const svgNodes = document.getElementById('svg-nodes');
    
    // Controls
    const inputEl = document.getElementById('binary-input');
    const errorEl = document.getElementById('input-error');
    const tapeContainer = document.getElementById('tape-container');
    const btnReset = document.getElementById('btn-reset');
    const btnStep = document.getElementById('btn-step');
    const btnPlay = document.getElementById('btn-play');
    const statusState = document.getElementById('status-state');
    const statusResult = document.getElementById('status-result');

    // === Global State ===
    let presets = [];
    let activeDFA = null;
    
    // Simulator State
    let currentState = '';
    let inputString = '';
    let currentIndex = 0;
    let isPlaying = false;
    let playInterval = null;
    let animationSpeed = 500;

    // === INIT ===
    function init() {
        if(window.DFAGenerators) {
            presets = window.DFAGenerators.init();
            setupCategories();
            renderLibrary();
        } else {
            console.error("DFAGenerators not found");
        }

        // Library listeners
        searchInput.addEventListener('input', renderLibrary);
        categoryFilter.addEventListener('change', renderLibrary);
        sortSelect.addEventListener('change', renderLibrary);

        // Simulator listeners
        btnBack.addEventListener('click', () => switchView('library'));
        inputEl.addEventListener('input', handleInput);
        btnReset.addEventListener('click', resetSimulation);
        btnStep.addEventListener('click', stepForward);
        btnPlay.addEventListener('click', togglePlay);
    }

    // === LIBRARY LOGIC ===
    function setupCategories() {
        const categories = new Set(presets.map(p => p.category));
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            categoryFilter.appendChild(opt);
        });
    }

    function renderLibrary() {
        const query = searchInput.value.toLowerCase();
        const cat = categoryFilter.value;
        const sortBy = sortSelect.value;

        // Filter
        let filtered = presets.filter(p => {
            const matchesQuery = p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
            const matchesCat = cat === 'All' || p.category === cat;
            return matchesQuery && matchesCat;
        });

        // Sort
        if (sortBy === 'statesAsc') {
            filtered.sort((a,b) => a.stateCount - b.stateCount);
        } else if (sortBy === 'statesDesc') {
            filtered.sort((a,b) => b.stateCount - a.stateCount);
        }

        presetStats.textContent = `Showing ${filtered.length} template${filtered.length !== 1 ? 's' : ''}`;
        
        presetGrid.innerHTML = '';
        filtered.forEach(preset => {
            const card = document.createElement('div');
            card.className = 'preset-card';
            card.innerHTML = `
                <div class="category-badge">${preset.category}</div>
                <h3>${preset.title}</h3>
                <p>${preset.description}</p>
                <div class="card-footer">
                    <span class="badge-state-count">${preset.stateCount} states</span>
                    <span>Select ➔</span>
                </div>
            `;
            card.addEventListener('click', () => loadPreset(preset));
            presetGrid.appendChild(card);
        });
    }

    function switchView(view) {
        if (view === 'simulator') {
            libraryView.classList.add('hidden');
            setTimeout(() => {
                libraryView.style.display = 'none';
                simulatorView.style.display = 'block';
                setTimeout(() => simulatorView.classList.remove('hidden'), 50);
            }, 400); // Wait for transition
        } else {
            stopPlay();
            simulatorView.classList.add('hidden');
            setTimeout(() => {
                simulatorView.style.display = 'none';
                libraryView.style.display = 'block';
                setTimeout(() => libraryView.classList.remove('hidden'), 50);
            }, 400);
        }
    }

    // === SVG RENDERING ENGINE ===
    // Creates a circular layout mapping N states around the center
    function buildSVG(dfaObj) {
        const dfa = dfaObj.dfa;
        const states = Object.keys(dfa.states);
        const N = states.length;
        
        // Geometry constraints
        const cx = 400; const cy = 300; const R = N < 6 ? 160 : 220; const nodeR = 30;

        const posMap = {};
        svgNodes.innerHTML = '';
        svgEdges.innerHTML = '';

        // 1. Calculate positions
        states.forEach((state, i) => {
            // angle starts from top (-90 deg), evenly distributed
            const angle = -Math.PI/2 + (Math.PI * 2 * i) / N;
            posMap[state] = {
                x: cx + R * Math.cos(angle),
                y: cy + R * Math.sin(angle),
                angle: angle
            };
        });

        // 2. Render Start Arrow (pointing to start state)
        const startState = dfa.startState;
        const stPos = posMap[startState];
        // Offset starting pointing arrow outside the circle slightly opposite to angle
        const saX = stPos.x + 80 * Math.cos(stPos.angle - 0.5);
        const saY = stPos.y + 80 * Math.sin(stPos.angle - 0.5);
        
        svgNodes.innerHTML += `
            <path d="M ${saX} ${saY} L ${stPos.x + 35*Math.cos(stPos.angle-0.5)} ${stPos.y + 35*Math.sin(stPos.angle-0.5)}" 
                  class="edge-path" stroke-width="2" marker-end="url(#arrowhead)"/>
            <text x="${saX-10}" y="${saY-10}" class="start-label">start</text>
        `;

        // 3. Render Edges
        // Track drawn edges to handle bidirectional curves
        states.forEach(from => {
            const p1 = posMap[from];
            const trans = dfa.transitions[from] || {};
            
            // grouping transitons by destination
            const routes = {};
            for (let char in trans) {
                const to = trans[char];
                if(!routes[to]) routes[to] = [];
                routes[to].push(char);
            }

            for (let to in routes) {
                const symbols = routes[to].join(',');
                const edgeId = `edge-${from}-${to}`; // Need to group by unique path
                const p2 = posMap[to];

                let pathD = "";
                let labelX, labelY;

                if (from === to) {
                    // Self-loop: Create a Bezier loop extending outward away from center
                    const lDist = 120;
                    const cp1x = p1.x + lDist * Math.cos(p1.angle - 0.5);
                    const cp1y = p1.y + lDist * Math.sin(p1.angle - 0.5);
                    const cp2x = p1.x + lDist * Math.cos(p1.angle + 0.5);
                    const cp2y = p1.y + lDist * Math.sin(p1.angle + 0.5);
                    
                    pathD = `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                    labelX = p1.x + (lDist - 20) * Math.cos(p1.angle);
                    labelY = p1.y + (lDist - 20) * Math.sin(p1.angle);
                } else {
                    // Curving arc to avoid straight lines crossing the center or bidirectional overlapping
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const mx = (p1.x + p2.x) / 2;
                    const my = (p1.y + p2.y) / 2;
                    
                    // Normal vector to the line
                    const nx = -dy / dist;
                    const ny = dx / dist;
                    
                    // Curve magnitude
                    const curveOffset = 40; 
                    const cx1 = mx + nx * curveOffset;
                    const cy1 = my + ny * curveOffset;

                    pathD = `M ${p1.x} ${p1.y} Q ${cx1} ${cy1} ${p2.x} ${p2.y}`;
                    labelX = cx1;
                    labelY = cy1;
                }

                // Append Edge Group
                // Individual paths per character transition to light them up
                routes[to].forEach((char) => {
                   svgEdges.innerHTML += `
                    <g id="edge-${from}-${char}">
                        <path d="${pathD}" class="edge-path" marker-end="url(#arrowhead)"/>
                    </g>
                   `;
                });
                
                // Append text label once for the whole route (e.g. "0,1")
                svgEdges.innerHTML += `
                    <g id="label-${from}-${to}">
                        <circle cx="${labelX}" cy="${labelY}" r="12" class="edge-label-bg"/>
                        <text x="${labelX}" y="${labelY + 2}" class="edge-label" id="text-${from}-${to}">${symbols}</text>
                    </g>
                `;
            }
        });

        // 4. Render Nodes
        states.forEach(state => {
            const p = posMap[state];
            const isAccept = dfa.states[state].isAccept;
            const label = dfa.states[state].label;
            
            let html = `
                <g class="state-group" id="node-${state}">
                    <circle cx="${p.x}" cy="${p.y}" r="${nodeR}" class="state-bg"/>
            `;
            if(isAccept) html += `<circle cx="${p.x}" cy="${p.y}" r="${nodeR - 6}" class="state-inner"/>`;
            html += `
                    <text x="${p.x}" y="${p.y + 2}" class="state-text">${label}</text>
                </g>
            `;
            svgNodes.innerHTML += html;
        });
    }

    // === SIMULATOR LOGIC ===
    function loadPreset(presetObj) {
        activeDFA = presetObj;
        
        simTitle.textContent = presetObj.title;
        simDesc.textContent = presetObj.description;
        
        inputEl.value = '';
        errorEl.textContent = '';
        
        buildSVG(presetObj);
        switchView('simulator');
        resetSimulation();
    }

    function handleInput(e) {
        const val = e.target.value;
        const valid = /^[01]*$/.test(val);
        if (!valid) {
            errorEl.textContent = 'Only 0 and 1 are allowed.';
            e.target.value = val.replace(/[^01]/g, '');
        } else {
            errorEl.textContent = '';
        }
        resetSimulation();
    }

    function renderTape() {
        inputString = inputEl.value;
        tapeContainer.innerHTML = '';
        if (inputString.length === 0) {
            tapeContainer.innerHTML = '<div class="tape-placeholder">Awaiting input...</div>';
            return;
        }
        for (let i = 0; i < inputString.length; i++) {
            const cell = document.createElement('div');
            cell.className = 'tape-cell';
            cell.textContent = inputString[i];
            cell.id = `tape-cell-${i}`;
            tapeContainer.appendChild(cell);
        }
    }

    function resetSimulation() {
        if(!activeDFA) return;
        stopPlay();
        currentState = activeDFA.dfa.startState;
        currentIndex = 0;
        
        renderTape();
        clearActiveVisuals();
        highlightState(currentState);
        
        statusState.textContent = 'start ('+activeDFA.dfa.states[currentState].label+')';
        updateResultBadge('Ready', 'badge');
        
        btnStep.disabled = inputString.length === 0;
        btnPlay.disabled = inputString.length === 0;
        if(inputString.length > 0) btnPlay.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play';
    }

    function stepForward() {
        if (!activeDFA || currentIndex >= inputString.length) return;

        const symbol = inputString[currentIndex];
        const nextState = activeDFA.dfa.transitions[currentState][symbol];
        
        // Trap state fallback
        if(!nextState) {
            finishSimulation(true); 
            return;
        }

        highlightEdge(currentState, nextState, symbol);
        
        const currentCell = document.getElementById(`tape-cell-${currentIndex}`);
        if(currentCell) {
            currentCell.classList.add('active');
            if (currentIndex > 0) {
                const prevCell = document.getElementById(`tape-cell-${currentIndex - 1}`);
                if(prevCell) { prevCell.classList.remove('active'); prevCell.classList.add('consumed'); }
            }
        }

        setTimeout(() => {
            clearActiveEdges();
            currentState = nextState;
            highlightState(currentState);
            statusState.textContent = activeDFA.dfa.states[currentState].label;
            currentIndex++;
            
            if (currentIndex >= inputString.length) {
                finishSimulation(false);
            } else if (currentCell) {
                currentCell.classList.remove('active');
                currentCell.classList.add('consumed');
                const nextCell = document.getElementById(`tape-cell-${currentIndex}`);
                if(nextCell) nextCell.classList.add('active');
            }
        }, animationSpeed);
    }

    function finishSimulation(haltedEarly) {
        stopPlay();
        btnStep.disabled = true;
        btnPlay.disabled = true;
        
        if (currentIndex > 0) {
            const lastCell = document.getElementById(`tape-cell-${currentIndex - 1}`);
            if(lastCell) { lastCell.classList.remove('active'); lastCell.classList.add('consumed'); }
        }

        const isAccept = activeDFA.dfa.states[currentState]?.isAccept && !haltedEarly;
        const node = document.getElementById(`node-${currentState}`);
        
        if (isAccept) {
            if(node) node.classList.add('accepted');
            updateResultBadge('Accepted', 'badge success');
        } else {
            if(node) node.classList.add('rejected');
            updateResultBadge('Rejected', 'badge error');
        }
    }

    function togglePlay() { isPlaying ? stopPlay() : startPlay(); }

    function startPlay() {
        if (currentIndex >= inputString.length) resetSimulation();
        isPlaying = true;
        btnPlay.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause';
        btnStep.disabled = true;
        
        playInterval = setInterval(() => {
            if (currentIndex < inputString.length) stepForward();
            else stopPlay();
        }, animationSpeed + 250);
    }

    function stopPlay() {
        isPlaying = false;
        clearInterval(playInterval);
        if(inputString.length > 0 && currentIndex < inputString.length) {
            btnPlay.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play';
            btnStep.disabled = false;
        }
    }

    function clearActiveVisuals() {
        document.querySelectorAll('.state-group').forEach(el => el.classList.remove('active', 'accepted', 'rejected'));
        clearActiveEdges();
    }

    function clearActiveEdges() {
        document.querySelectorAll('.edge-path, .edge-label, .text').forEach(el => {
            el.classList.remove('active');
            if(el.tagName === 'path') el.setAttribute('marker-end', 'url(#arrowhead)');
        });
    }

    function highlightState(stateId) {
        document.querySelectorAll('.state-group').forEach(el => el.classList.remove('active'));
        const node = document.getElementById(`node-${stateId}`);
        if (node) node.classList.add('active');
    }

    function highlightEdge(from, to, char) {
        const edgeG = document.getElementById(`edge-${from}-${char}`);
        if(edgeG) {
            const p = edgeG.querySelector('path');
            p.classList.add('active');
            p.setAttribute('marker-end', 'url(#arrowhead-active)');
        }
        const textG = document.getElementById(`text-${from}-${to}`);
        if(textG) textG.classList.add('active');
    }

    function updateResultBadge(text, className) {
        statusResult.className = className;
        statusResult.textContent = text;
    }

    init();
});
