const { Client } = require('discord-rpc');
const WebSocket = require('ws');
const fs = require('fs');
const readline = require('readline');
const readlineSync = require('readline-sync');
const CONFIG_FILE_PATH = 'config.json';
let rpcClient;
let lastData = "";
let config = {};
let ignoreMessagesFlag = false; 
let inMainMenuFlag = false;

// First run check (cfg)
function generateConfigFirstRun() {
    if (config.firstRun) {
        console.log("First run detected. Creating a new config file...");

        const language = readlineSync.question('Select your language (0 for English, 1 for Russian): ') === '1' ? 'ru' : 'en';
        const faction = readlineSync.question('Select your faction (0 for BEAR, 1 for USEC): ') === '1' ? 'USEC' : 'BEAR';
        const playerName = readlineSync.question('Enter your player name: ');
        const wsPort = readlineSync.question('Enter WebSocket port (default 8080): ', { defaultInput: '8080' });

        config = { firstRun: false, faction, playerName, language, wsPort: parseInt(wsPort, 10), ignoreMessages: true };
        fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 4));
        console.log("Config file created successfully:", config);

        loadLocalization(config.language);
    }
}

// Generating new cfg, because it's corrupted or doesn't exist
function generateNewConfig() {
    console.log("Creating a new config file...");

        const language = readlineSync.question('Select your language (0 for English, 1 for Russian): ') === '1' ? 'ru' : 'en';
        const faction = readlineSync.question('Select your faction (0 for BEAR, 1 for USEC): ') === '1' ? 'USEC' : 'BEAR';
        const playerName = readlineSync.question('Enter your player name: ');
        const wsPort = readlineSync.question('Enter WebSocket port (default 8080): ', { defaultInput: '8080' });

        config = { firstRun: false, faction, playerName, language, wsPort: parseInt(wsPort, 10), ignoreMessages: true };
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 4));
    console.log("Config file created successfully:", config);

    loadLocalization(config.language);
}


// Reading config file
function readConfig() {
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH));
        ignoreMessages = config.ignoreMessages;
        loadLocalization(config.language);
		generateConfigFirstRun();
    } catch (error) {
        console.error('Error reading config file:', error);
        generateNewConfig();
    }
}

// Locales init
function loadLocalization(language) {
    try {
        const localizationFile = `locales\\${language}.json`;
        localization = JSON.parse(fs.readFileSync(localizationFile));
        console.log(localization.locSuccess);
    } catch (error) {
        console.error('Failed to read localization file:', error);
        localization = JSON.parse(fs.readFileSync('locales\\en.json'));
    }
}

readConfig();

// Map localization
const mapImages = {
    'factory4_day': localization.factory4_day,
    'factory4_night': localization.factory4_night,
    'TarkovStreets': localization.TarkovStreets,
    'Sandbox': localization.Sandbox,
    'Woods': localization.Woods,
    'Shoreline': localization.Shoreline,
    'laboratory': localization.laboratory,
    'Interchange': localization.Interchange,
    'RezervBase': localization.RezervBase,
    'bigmap': localization.bigmap,
    'Lighthouse': localization.Lighthouse,
};

const CLIENT_ID = '1238480951349219420';
const TIMEOUT_DURATION = 10000; 
let timeout;

// Connecting to RPC
function connectToRPC() {
    rpcClient = new Client({ transport: 'ipc' });

    rpcClient.login({ clientId: CLIENT_ID }).then(() => {
        console.log(localization.rpcConSuccess);
        checkWebSocketAvailability();
    }).catch((error) => {
        console.error(localization.rpcConFail, error);
        setTimeout(connectToRPC, 15000);
        console.log(localization.rpcRetry);
    });
}

connectToRPC();

let websocket;

// Connecting to WS
function checkWebSocketAvailability() {
    const wsPort = config.wsPort || 8080;
    websocket = new WebSocket(`ws://localhost:${wsPort}`);

    websocket.on('error', (error) => {
		console.log(localization.wsUnavailable);
        console.error('Details:', error);
        setTimeout(checkWebSocketAvailability, 15000); 
    });

    websocket.on('open', () => {
        console.log(localization.wsConnected);
        startTimeout();
    });

websocket.on('message', (message) => {
    resetTimeout();
    if (!message) {
        // There was something but i forgor :skull:
    } else {
        try {
            if (!ignoreMessagesFlag) {
                const data = JSON.parse(message.toString());
                console.log(localization.wsGotMessage, message);
                console.log(localization.wsData, data);
                updateRPCFromData(data);
				console.log(localization.inRaidMessage);
                if (config.ignoreMessages) {
                    ignoreMessagesFlag = true;
                }
            } else {
                // And there's nothing here that i forgor :skull:
            }
        } catch (error) {
            console.error(localization.wsParsingFailed, error);
        }
    }
});
}

// WS not active = go to menu lol
function startTimeout() {
    timeout = setTimeout(() => {
        console.log(localization.wsNoActivity);
        console.log(localization.playerInMenuMessage);
        updateRPCForMainMenu();
		ignoreMessagesFlag = false;
    }, TIMEOUT_DURATION);
}

function resetTimeout() {
    clearTimeout(timeout);
    startTimeout();
}

// Player in menu
function updateRPCForMainMenu() {
    const smallImageKey = config.faction.toLowerCase();
    const smallImageText = `${config.faction} - ${config.playerName}`;

    const lastData = "Shelter";

    rpcClient.setActivity({
        details: localization.playerInMenu,
        largeImageKey: 'bunker',
        largeImageText: localization.Shelter,
        smallImageKey: smallImageKey,
        smallImageText: smallImageText,
        startTimestamp: new Date(),
        instance: false
    }).then(() => {
        console.log(localization.rpcUpdated);
        ignoreMessagesFlag = false;
    }).catch((error) => {
        console.error(localization.rpcUpdateFailed, error);
    });
}


// Player in raid
function updateRPCFromData(data) {
    const smallImageKey = config.faction.toLowerCase();
    const smallImageText = `${config.faction} - ${config.playerName}`;

    const mapName = data.mapName || localization.unknown;
    const mapNameTranslated = mapImages[mapName] || localization.unknown; 

    const largeImageKey = mapImages[mapName] ? mapName.toLowerCase() : 'default_map_image'; 
	
    if (mapName !== lastData || inMainMenuFlag) {
        rpcClient.setActivity({
            state: mapNameTranslated, 
            details: inMainMenuFlag ? localization.playerInMenu : localization.inRaid, 
            largeImageKey: largeImageKey,
            largeImageText: localization.imageText, 
            smallImageKey: smallImageKey,    
            smallImageText: smallImageText, 
            startTimestamp: new Date(),     
            instance: false          
        }).catch((error) => {             
            console.error(localization.rpcUpdateFailed, error); 
        });
        
        lastData = mapName;
        inMainMenuFlag = true; // the hell is it doing here??? like... why??
    }
}