const { loadUserData, runeCommand } = require("./commands");
const tmi = require("tmi.js");
const fs = require("fs");

const CONFIG = JSON.parse(fs.readFileSync("config.json", "utf8"));

// Define configuration options
const opts = {
  identity: {
    username: "Rune_BOT",
    password: CONFIG.TWITCH_API_KEY,
  },
  channels: [],
};

module.exports = function () {
  opts.channels = CONFIG.TWITCH_CHANNELS;

  // Create a client with our options
  const client = new tmi.client(opts);

  // Register our event handlers (defined below)
  client.on("message", onMessageHandler);
  client.on("connected", onConnectedHandler);

  // Connect to Twitch:
  client.connect();

  // Called every time a message comes in
  function onMessageHandler(target, context, msg, self) {
    if (self) {
      return;
    } // Ignore messages from the bot

    // Remove whitespace from chat message
    let command = msg.trim();

    // If the command is known, let's execute it
    if (command.includes("!runas")) {
      let summonerName = command.replace("!runas ", "");
      summonerName = summonerName.replace(/\"/g, "");
      if (command.length === 0) {
        client.say('Meh, o comando é !runas "NomeDoInvocador"');
      } else {
        runeCommand(client, target, summonerName);
        console.log(`* Executed !runas command`);
      }
    } else {
      console.log(`* Unknown command ${msg.trim()}`);
    }
  }

  // Called every time the bot connects to Twitch chat
  function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
  }
};
