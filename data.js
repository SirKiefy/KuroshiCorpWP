export const c3iState = {
    currentUser: null,
    firebaseUser: null,
    waypoints: [],
    auditLog: [],
    chatMessages: [],
    plans: [],
    tasks: [],
    intel: {},
    armoury: {}, 
    codex: {},
    comparisonAssets: [],
    listeners: [],
    users: {},
};

export function loadData() {
    c3iState.users = {
        'architect':    { username: 'SirKiefy',                password: 'R9x!Vt3Qw#Lp8J', clearance: 7, admin: true },
        'vanguard':     { username: 'saticron',                password: 'M7u$Zj1Lb^Nx4R', clearance: 6, admin: false },
        'foxbatactual': { username: 'FoxbatActual',            password: '991964',         clearance: 6, admin: false },
        'nightstalker': { username: 'nightmare_of_the_living', password: 'B4v*Xg9Hp&Lf2T', clearance: 4, admin: false },
        'rocketman':    { username: 'daniel.4031',             password: 'T5q#Ch6Jm%Ws1Y', clearance: 3, admin: false },
        'deadeye':      { username: 'sharps54',                password: 'L8n^Vr4Xp!Bd3K', clearance: 3, admin: false },
        'reaper':       { username: 'halolad',                 password: 'S1j%Ht7Zk&Qp9N', clearance: 3, admin: false },
        'wolfhound':    { username: 'dr_lupus',                password: 'H3p$Gn2Fr#Dz6M', clearance: 3, admin: false },
        'overwatch':    { username: 'thejetninja',             password: 'V6m*Kw5Xb!Tf8R', clearance: 3, admin: false },
        'ironclad':     { username: 'cowboybama',              password: 'C9t&Ls1Vg@Pr4Q', clearance: 3, admin: false },
    };

    c3iState.intel = {
        'FSSA': { name: 'FSSA (Federated Sovereign State of Armkava)', threat: 'Hostile', hostility: 'Active', location: 'Unknown', strength: { ground: 'Equal', air: 'Weaker', naval: 'Equal' }, report: 'A hostile state actor.', hierarchy: { leader: 'Day (valcry97)', members: ['jake from statefarm (thisscreenisnuts)'] }, assets: 'Standard military hardware.'},
        'BSS': { name: 'BSS (Black Sea Syndicate)', threat: 'Neutral', hostility: 'Opportunistic', location: 'Black Sea', strength: { ground: 'Weaker', air: 'Obsolete', naval: 'Superior' }, report: 'A neutral syndicate operating in the Black Sea region.', hierarchy: { leader: 'Quasitedjr.TTV', members: ['Bizmark7 (Admin)', 'dloglo1980', 'Snowwolf (snowwolf1512)'] }, assets: 'Naval assets, smuggling routes.'},
        'NIM': { name: 'NIM (Nordman Industries & Manufacturing)', threat: 'Neutral', hostility: 'Aggressive', location: 'Northern Territories', strength: { ground: 'Superior', air: 'Equal', naval: 'Weaker' }, report: 'A neutral but aggressive industrial corporation. Hostility is advised in interactions.', hierarchy: { leader: 'Fred (fredaibot, Admin/Overseer)', members: ['KesseL (kessel5657)', 'Kokonoe (kokonoe2280)', 'NorthWind (north.wind772)'] }, assets: 'Advanced manufacturing facilities, prototype weaponry.'},
        'T-T': { name: 'T-T (Terra Titans)', threat: 'Avoid', hostility: 'Dominant', location: 'Global', strength: { ground: 'Overwhelming', air: 'Overwhelming', naval: 'Overwhelming' }, report: 'A powerful faction that should be avoided. Holds significant influence.', hierarchy: { leader: 'DarkXeRoX (darkxerox, Server Owner)', members: ['K4rma (k4rmaletracteur)', 'Rudi/Noah (ruaidhri.noah, Admin)', 'Delfred353', 'PossibleHacker', 'Gifted Lion', 'Aragath', 'Tellyhead'] }, assets: 'High-tier military assets, server administrative control.'},
        'BBC': { name: 'BBC (Bean Bois Corporation)', threat: 'Unknown', hostility: 'Unknown', location: 'Unknown', strength: { ground: 'Unknown', air: 'Unknown', naval: 'Unknown' }, report: 'An organization with unknown motives and capabilities.', hierarchy: { leader: 'syreX (bessechurger)' }, assets: 'Unknown.'},
        'C0UM': { name: 'C0UM (Confederation Of Uniform Members)', threat: 'Unknown', hostility: 'Unknown', location: 'Unknown', strength: { ground: 'Unknown', air: 'Unknown', naval: 'Unknown' }, report: 'A confederation with unknown motives.', hierarchy: { leader: 'Agent Brick (thunderbord)' }, assets: 'Unknown.'},
        'OCF': { name: 'OCF (Oceania Coalition Force)', threat: 'Neutral', hostility: 'Passive', location: 'Oceania', strength: { ground: 'Equal', air: 'Equal', naval: 'Superior' }, report: 'A non-hostile coalition with claims of passive behavior.', hierarchy: { leader: 'TheJetNinja' }, assets: 'Regional defensive forces.'}
    };

    c3iState.codex = {
        'Naval Server Rules': `<h3>General</h3><ul><li>All grids are to remain within the planet atmosphere.</li><li>Naval Warships and Structures are large grids only.</li><li>Aircraft and ground vehicles are small grids only.</li><li>Each Grid requires the correct GridCore for that class, Structure GridCores must be above voxels and water.(cleanup deletes grids without a gridcore)</li></ul><h4>Block Limits</h4><p>GridCores will automatically limit the amount of certain blocks, but here is a general list for specific blocks:</p><ul><li>All ships can fit a max of 2 vents.</li><li>O2 GENERATORS ARE ONLY ALLOWED ON BASES AND SMALL GRIDS TO PRODUCE FUEL AND ONLY 1 PER GRID IS ALLOWED.</li><li>Ships will be able to fit 2 navigation computer blocks & 3 rudder blocks.</li><li>ONLY BASES CAN HAVE A MAXIMUM OF 1 FUEL BLOCK REFINERY. SHIPS MAY HAVE 1 EMERGENCY FUEL Converter.</li></ul><h4>Jet Pack Usage</h4><p>JETPACKS ARE ONLY TO BE USED AROUND FRIENDLY GRIDS FOR LOGISTICAL PURPOSES. DO NOT FLY AROUND ENEMY GRIDS. THEY WILL ONLY OPERATE WITHIN A 1KM RANGE OF A FRIENDLY GRIDCORE.</p>`,
        'War & Sieges': `<h3>Declaring War</h3><p>WAR IS THE METHOD BY WHICH NATIONS FIGHT OVER TERRITORY. TO MAINTAIN GOOD GAMEPLAY ANY FACTION WISHING TO ENGAGE WAR MUST FOLLOW THESE RULES.</p><ul><li>Factions who wish to declare war on another faction must declare their intentions in diplomacy 48hrs prior to initiating a siege.</li><li>An admin must approve the war. Admins reserve the right to decline a war if it is warranted.</li><li>War declarations must be for a reason.</li><li>Attackers must define a target for the war and the closest attacker structure will be their FOB.</li><li>After a war is completed the declaring faction is on a cooldown of 7 days before they can declare another war.</li></ul><h3>Siege</h3><ul><li>Once war is declared and an admin approves it you may start sieging 48 hrs after the declaration message.</li><li>Efforts should be made to make sure both sides are able to be on for the fight.</li><li>Attackers must initiate the siege by moving within 15km of the Structure they wish to attack.</li><li>Once the siege is initiated Defenders have 10 minutes to push the attackers out of the Territory Capture zone. If they fail, their SZ will drop.</li><li>Attackers have 2 hours to siege the base and destroy the Defender's Base Grid Core.</li><li>If the Defenders survive for 2 hours their SZ will be restored and a cooldown of 6 hours will start before a new Siege can begin.</li><li>Wars last for 5 days. Defenders can attack the Attackers FOB to end the war early.</li></ul>`,
        'Faction & Grid Limits': `<h3>Factions</h3><p>A faction is a group of players working together towards a common goal. Only have grids out in the world that are actively being used. Exploiting factions to increase fleet cap will result in a ban.</p><h3>Ship and Structure limits</h3><table class="data-table"><thead><tr><th>Structure Type</th><th>Amount</th><th>Ship Class Name</th><th>Amount</th></tr></thead><tbody><tr><td>Main Base</td><td>1</td><td>Corvette</td><td>4</td></tr><tr><td>Fort</td><td>5</td><td>Frigate</td><td>3</td></tr><tr><td>Outpost</td><td>10</td><td>Destroyer</td><td>3</td></tr><tr><td>Total Structures</td><td>16</td><td>Cruiser</td><td>2</td></tr><tr><td></td><td></td><td>Submarine</td><td>1</td></tr><tr><td></td><td></td><td>Logistics Ship</td><td>2</td></tr><tr><td></td><td></td><td>Battleship</td><td>1</td></tr><tr><td></td><td></td><td>Aircraft Carrier</td><td>1</td></tr><tr><td></td><td></td><td>Max FleetSize</td><td>18</td></tr></tbody></table>`,
        'Resource Acquisition': `<h3>Common Ores (Iron, Silicon, Nickel)</h3><p>Mined with Resource Claim Pylons (Light, Medium, Heavy). Yields can be improved with modules. Interference radii apply.</p><h3>Uncommon Ores (Cobalt, Magnesium, Silver, Gold)</h3><p>Found in Resource Zones in water. Require a mining rig and Fuel Blocks. Zones deplete over time.</p><h3>Rare Ores (Platinum, Uranium)</h3><p>Found in random NPC bunkers or from King of the Hill style events.</p>`
    };
    
    c3iState.armoury = {
        'Naval': {
            'Support': {
                'Corvette': { type: 'Ship Class', data: { 'Max Dry Mass': '1000', 'Offensive Points': 20, 'Defensive Points': 10, 'Propulsion': 850, 'Notes': 'TBA' } },
                'Frigate': { type: 'Ship Class', data: { 'Max Dry Mass': '2500', 'Offensive Points': 35, 'Defensive Points': 20, 'Propulsion': 1100, 'Notes': 'TBA' } },
                'Logistics Ship': { type: 'Ship Class', data: { 'Max Dry Mass': '2250', 'Offensive Points': '0', 'Defensive Points': 12, 'Propulsion': 2000, 'Notes': 'Mainly used to transport vehicles or supplies' } },
            },
            'MultiRole': {
                'Destroyer': { type: 'Ship Class', data: { 'Max Dry Mass': '5500', 'Offensive Points': 45, 'Defensive Points': 30, 'Propulsion': 2000, 'Notes': 'TBA' } },
                'Cruiser': { type: 'Ship Class', data: { 'Max Dry Mass': '10000', 'Offensive Points': 60, 'Defensive Points': 35, 'Propulsion': 3000, 'Notes': 'TBA' } },
            },
            'Capital': {
                'Battleship': { type: 'Ship Class', data: { 'Max Dry Mass': '20000', 'Offensive Points': 80, 'Defensive Points': 40, 'Propulsion': 4000, 'Notes': 'Cannot field torpedo' } },
                'Carrier': { type: 'Ship Class', data: { 'Max Dry Mass': '14000', 'Offensive Points': 16, 'Defensive Points': 30, 'Propulsion': 3000, 'Notes': 'Can be used as a mobile airfield' } },
            },
            'Submersible': {
                'Submarine': { type: 'Ship Class', data: { 'Max Dry Mass': '3500', 'Offensive Points': 12, 'Defensive Points': 4, 'Propulsion': 2000, 'Notes': 'Can fit submarine torpedo tubes' } },
            },
        },
        'Air': {
            'Fighter': { type: 'Aircraft Class', data: { 'Min Weight': 10, 'Max Weight': 20, 'Max Thrust': 30, 'L Hardpoints': 4, 'M Hardpoints': 4, 'Gun Systems': 2, 'Counter Measures': 2, 'Notes': 'Specialised in air dominance. Cannot field Medium A2G Ordinance Hardpoints.' } },
            'Strike Fighter': { type: 'Aircraft Class', data: { 'Min Weight': 20, 'Max Weight': 32.5, 'Max Thrust': 60, 'L Hardpoints': 4, 'M Hardpoints': 6, 'H Hardpoints': 2, 'Gun Systems': 2, 'Counter Measures': 2, 'Notes': 'Multi-role based aircraft. Cannot field Medium A2A Ordinance Hardpoints.' } },
            'Bomber': { type: 'Aircraft Class', data: { 'Min Weight': 32.5, 'Max Weight': '0', 'Max Thrust': 80, 'H Hardpoints': 6, 'HY Hardpoints': 15, 'Counter Measures': 4, 'Notes': 'Main air to ground class. Cannot fit any A2A missile systems.' } },
        },
        'Ground': {
            'MBT': { type: 'Vehicle Class', data: { 'Max Weight': '80', 'Speed': '80', 'Hardpoints': 8, 'Notes': 'Limited to one primary barrel.' } },
            'AAV': { type: 'Vehicle Class', data: { 'Max Weight': '60', 'Speed': '80', 'Hardpoints': 8, 'Notes': 'Only allowed anti-aircraft barrels. Cannot engage other ground vehicles.' } },
            'Artillery': { type: 'Vehicle Class', data: { 'Max Weight': '50', 'Speed': '50', 'Hardpoints': 8, 'Notes': 'Can only use artillery barrels.' } },
        },
        'Analysis': {
            'CIWS Performance': { type: 'Report', data: [
                { 'Missile Threat': '4x P-250 launchers', 'CIWS Defense': '4x AK-630-2', 'CIWS Success Rate': '96.88%', 'Missile Penetration Rate': '3.12%' },
                { 'Missile Threat': '4x P-270 launchers', 'CIWS Defense': '4x Phalanx CIWS', 'CIWS Success Rate': '37.50%', 'Missile Penetration Rate': '62.50%' },
                { 'Missile Threat': '4x P-270 launchers', 'CIWS Defense': '4x Goalkeeper CIWS', 'CIWS Success Rate': '62.50%', 'Missile Penetration Rate': '37.50%' },
                { 'Missile Threat': '4x P-270 launchers', 'CIWS Defense': '4x AK-630', 'CIWS Success Rate': '75.00%', 'Missile Penetration Rate': '25.00%' },
                { 'Missile Threat': '4x Slava launchers (P-1000)', 'CIWS Defense': '4x Phalanx CIWS', 'CIWS Success Rate': '46.88%', 'Missile Penetration Rate': '53.12%' },
                { 'Missile Threat': '4x Slava launchers (P-1000)', 'CIWS Defense': '4x Goalkeeper CIWS', 'CIWS Success Rate': '65.62%', 'Missile Penetration Rate': '34.38%' },
                { 'Missile Threat': '4x Slava launchers (P-1000)', 'CIWS Defense': '4x AK-630', 'CIWS Success Rate': '84.38%', 'Missile Penetration Rate': '15.62%' },
                { 'Missile Threat': '4x Slava launchers (P-1000)', 'CIWS Defense': '4x AK-630-2', 'CIWS Success Rate': '100.00%', 'Missile Penetration Rate': '0.00%' },
            ]}
        }
    };
}
