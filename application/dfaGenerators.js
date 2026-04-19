// dfaGenerators.js
// Procedural generation of DFA preset configurations

const DFAGenerators = {
    presets: [],

    init() {
        this.generateDivisibility();
        this.generateStartsWith();
        this.generateContains();
        this.generateEndsWith();
        this.generateExactLength();
        return this.presets;
    },

    // 1. Divisibility Generator (N=2 to 32)
    generateDivisibility() {
        for (let n = 2; n <= 32; n++) {
            const dfa = {
                id: `div_${n}`,
                title: `Divisible by ${n}`,
                description: `Accepts binary strings representing numbers divisible by ${n}`,
                category: 'Divisibility',
                stateCount: n,
                dfa: {
                    startState: 'q0',
                    states: {},
                    transitions: {}
                }
            };

            for (let i = 0; i < n; i++) {
                const stateName = `q${i}`;
                dfa.dfa.states[stateName] = { mod: i, isAccept: i === 0, label: stateName };
                dfa.dfa.transitions[stateName] = {
                    '0': `q${(2 * i) % n}`,
                    '1': `q${(2 * i + 1) % n}`
                };
            }
            this.presets.push(dfa);
        }
    },

    // Utility: Generate all binary strings of length 1 to maxLen
    getBinaryPatterns(maxLen) {
        const patterns = [];
        for (let len = 1; len <= maxLen; len++) {
            for (let i = 0; i < (1 << len); i++) {
                patterns.push(i.toString(2).padStart(len, '0'));
            }
        }
        return patterns;
    },

    // 2. Starts With (lengths 1 to 4)
    generateStartsWith() {
        const patterns = this.getBinaryPatterns(4);
        patterns.forEach(pattern => {
            const n = pattern.length;
            const dfa = {
                id: `starts_${pattern}`,
                title: `Starts with '${pattern}'`,
                description: `Accepts any string that starts with the binary sequence ${pattern}`,
                category: 'Prefix Matching',
                stateCount: n + 2,
                dfa: {
                    startState: 'q0',
                    states: {},
                    transitions: {}
                }
            };

            // States: q0 to qn, and trap state
            for (let i = 0; i <= n; i++) {
                dfa.dfa.states[`q${i}`] = { isAccept: i === n, label: `q${i}` };
                dfa.dfa.transitions[`q${i}`] = {};
            }
            dfa.dfa.states['qtrap'] = { isAccept: false, label: 'trap' };
            dfa.dfa.transitions['qtrap'] = { '0': 'qtrap', '1': 'qtrap' };

            for (let i = 0; i < n; i++) {
                const expectedChar = pattern[i];
                const otherChar = expectedChar === '0' ? '1' : '0';
                dfa.dfa.transitions[`q${i}`][expectedChar] = `q${i + 1}`;
                dfa.dfa.transitions[`q${i}`][otherChar] = 'qtrap';
            }
            // Accept state self-loops
            dfa.dfa.transitions[`q${n}`] = { '0': `q${n}`, '1': `q${n}` };

            this.presets.push(dfa);
        });
    },

    // helper function akin to KMP automaton calculation for overlapping prefixes
    getNextStateContains(pattern, currentStateLen, char, isEndsWith) {
        if (!isEndsWith && currentStateLen === pattern.length) return currentStateLen;
        let str = pattern.substring(0, currentStateLen) + char;
        while (str.length > 0) {
            if (pattern.startsWith(str)) {
                return str.length;
            }
            str = str.substring(1);
        }
        return 0;
    },

    // 3. Contains Substring (lengths 2 to 4)
    generateContains() {
        const patterns = this.getBinaryPatterns(4).filter(p => p.length >= 2);
        patterns.forEach(pattern => {
            const n = pattern.length;
            const dfa = {
                id: `contains_${pattern}`,
                title: `Contains '${pattern}'`,
                description: `Accepts strings that contain ${pattern} anywhere inside`,
                category: 'Substring Matching',
                stateCount: n + 1,
                dfa: {
                    startState: 'q0',
                    states: {},
                    transitions: {}
                }
            };

            for (let i = 0; i <= n; i++) {
                dfa.dfa.states[`q${i}`] = { isAccept: i === n, label: `q${i}` };
                dfa.dfa.transitions[`q${i}`] = {
                    '0': `q${this.getNextStateContains(pattern, i, '0', false)}`,
                    '1': `q${this.getNextStateContains(pattern, i, '1', false)}`
                };
            }
            this.presets.push(dfa);
        });
    },

    // 4. Ends With (lengths 2 to 4)
    generateEndsWith() {
        const patterns = this.getBinaryPatterns(4).filter(p => p.length >= 2);
        patterns.forEach(pattern => {
            const n = pattern.length;
            const dfa = {
                id: `ends_${pattern}`,
                title: `Ends with '${pattern}'`,
                description: `Accepts any string that ends exactly with the sequence ${pattern}`,
                category: 'Suffix Matching',
                stateCount: n + 1,
                dfa: {
                    startState: 'q0',
                    states: {},
                    transitions: {}
                }
            };

            for (let i = 0; i <= n; i++) {
                dfa.dfa.states[`q${i}`] = { isAccept: i === n, label: `q${i}` };
                dfa.dfa.transitions[`q${i}`] = {
                    '0': `q${this.getNextStateContains(pattern, i, '0', true)}`,
                    '1': `q${this.getNextStateContains(pattern, i, '1', true)}`
                };
            }
            this.presets.push(dfa);
        });
    },

    // 5. Exact Length
    generateExactLength() {
        for (let n = 1; n <= 10; n++) {
            const dfa = {
                id: `len_${n}`,
                title: `Exact Length ${n}`,
                description: `Accepts only binary strings of length exactly ${n}`,
                category: 'String Length',
                stateCount: n + 2,
                dfa: {
                    startState: 'q0',
                    states: {},
                    transitions: {}
                }
            };

            for (let i = 0; i <= n; i++) {
                dfa.dfa.states[`q${i}`] = { isAccept: i === n, label: `q${i}` };
                dfa.dfa.transitions[`q${i}`] = { '0': `q${i + 1}`, '1': `q${i + 1}` };
            }
            // Trap state for strings larger than N
            dfa.dfa.states['qtrap'] = { isAccept: false, label: 'trap' };
            dfa.dfa.transitions['qtrap'] = { '0': 'qtrap', '1': 'qtrap' };
            dfa.dfa.transitions[`q${n}`] = { '0': 'qtrap', '1': 'qtrap' };

            this.presets.push(dfa);
        }
    }
};

window.DFAGenerators = DFAGenerators;
