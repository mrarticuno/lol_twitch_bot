const axios = require("axios");
const fs = require("fs");
const Runes = JSON.parse(fs.readFileSync("runas.json", "utf8"));
const CONFIG = JSON.parse(fs.readFileSync("config.json", "utf8"));

const TEN_MINUTES = 10 * 60 * 1000;
const TEN_SECONDS = 10 * 1000;
const TWO_MINUTES = 10 * 60 * 1000;

const userData = [];

const dataCache = [];

function loadUserData(SummonerName) {
  return new Promise((resolve, reject) => {
    axios({
      method: "get",
      url: `https://${CONFIG.REGION_TAGLINE}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${SummonerName}`,
      headers: {
        "X-Riot-Token": CONFIG.RIOT_API_KEY,
      },
    })
      .then((response) => {
        if (response.data) {
          let accInfo = { ...response.data, name: SummonerName };
          userData.push(accInfo);
          resolve(accInfo);
        } else {
          console.info(
            "Summoner not found, please check if you typed it correctly, for names with space and special characters please use under double quotes"
          );
        }
      })
      .catch((error) => {
        reject();
        console.info(
          "Summoner not found, please check if you typed it correctly, for names with space and special characters please use under double quotes"
        );
      });
  });
}

function loadRunesData(encriptedId) {
  let prom = new Promise((resolve, reject) => {
    axios({
      method: "get",
      url: `https://${CONFIG.REGION_TAGLINE}.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${encriptedId}`,
      headers: {
        "X-Riot-Token": CONFIG.RIOT_API_KEY,
      },
    })
      .then((response) => {
        if (response.data) {
          let gameData = response.data;
          gameData.participants.forEach((summoner) => {
            if (summoner.summonerId == encriptedId) {
              resolve(summoner.perks);
            }
          });
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
  return prom;
}

function createRunesMessage(perks, summonerName) {
  let mainTree = Runes.find((x) => x.id == perks.perkStyle);
  let mainTreePerks = [];
  let subTree = Runes.find((x) => x.id == perks.perkSubStyle);
  let subTreePerks = [];
  perks.perkIds.forEach((id) => {
    mainTree.slots.forEach((slot) => {
      let rune = slot.runes.find((x) => x.id == id);
      if (rune) {
        mainTreePerks.push(rune.name);
      }
    });
    subTree.slots.forEach((slot) => {
      let rune = slot.runes.find((x) => x.id == id);
      if (rune) {
        subTreePerks.push(rune.name);
      }
    });
  });

  return `${summonerName} está usando Arvore principal:: ${
    mainTree.name
  } com ${mainTreePerks.join(" - ")} || Secundaria:: ${
    subTree.name
  } com ${subTreePerks.join(" - ")}`;
}

function runeCommand(client, target, command) {
  let indexRune = dataCache.findIndex((x) => x.name === command);
  let userDataAvailable = userData.find((x) => x.name === command);
  let executor = (data) => {
    loadRunesData(data.id)
      .then((perks) => {
        console.info("API REQUEST");
        let responseText = createRunesMessage(perks, command);
        dataCache.push({
          name: command,
          lastCallResponse: responseText,
          nextCallTime: new Date(new Date().getTime() + TEN_MINUTES),
        });
        client.say(target, responseText);
      })
      .catch(() => {
        if (
          dataCache[indexRune] &&
          dataCache[indexRune].lastCallResponse.length > 0
        ) {
          client.say(
            target,
            `No momento o jogador ${command} não esta em partida mas a ultima runa usada foi:`
          );
          client.say(target, dataCache[indexRune].lastCallResponse);
          dataCache[indexRune].nextCallTime = new Date(
            new Date().getTime() + TWO_MINUTES
          );
        } else {
          client.say(
            target,
            `O jogador ${command} não esta em partida, e não tenho registro da ultima pagina dele, tente novamente quando ele estiver em um jogo.`
          );
          dataCache.push({
            name: command,
            lastCallResponse: "",
            nextCallTime: new Date(new Date().getTime() + TWO_MINUTES),
          });
        }
      });
  };
  if (
    !dataCache[indexRune] ||
    dataCache[indexRune].nextCallTime === null ||
    new Date().getTime() - dataCache[indexRune].nextCallTime > TEN_MINUTES
  ) {
    if (userDataAvailable) {
      executor(userDataAvailable);
    } else {
      loadUserData(command).then((data) => {
        executor(data);
      });
    }
  } else {
    client.say(target, dataCache[indexRune].lastCallResponse);
  }
}

module.exports = {
  loadUserData,
  loadRunesData,
  createRunesMessage,
  runeCommand,
};
