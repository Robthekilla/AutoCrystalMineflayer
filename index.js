const mineflayer = require('mineflayer');
const vec3 = require('vec3');
const axios = require('axios');
var info = require("./info.json");

var pickaxe = 'netherite_pickaxe';
var harvestName = 'amethyst_cluster';
var harvestedName = 'amethyst_shard';
var metadata = 7;

const bot = mineflayer.createBot({
  host: info.host,
  username: info.username,
  password: info.password,
  port: info.port,
  auth: info.auth
})

var mcData;

bot.on('kicked', (reason, loggedIn) => sendLog("Bot Kicked", reason));
bot.on('error', err => sendLog("Internal Error", err));

bot.once('spawn', ()=>{
	console.log("[DEBUG] " + bot.username + " joined the server " + info.host + " on version " + bot.version);
	sendLog("Bot is now online", bot.username + " joined the server " + info.host + " on version " + bot.version);
	mcData = require('minecraft-data')(bot.version);
	cosmicLooper();
});

async function cosmicLooper() {
	if (bot.inventory.slots.filter(v=>v==null).length < 11) {
		await depositLoop();
	} else await farmLoop();
	setTimeout(cosmicLooper, 100);
}

async function depositLoop() {
	let chestBlock = bot.findBlock({
		matching: mcData.blocksByName['chest'].id,
	});

	if (!chestBlock) return;

	if (bot.entity.position.distanceTo(chestBlock.position) < 2) {
		bot.setControlState('forward', false);

		let chest = await bot.openChest(chestBlock);
		for (slot of bot.inventory.slots) {
			if (slot && slot.name == harvestedName) {
				await chest.deposit(slot.type, null, slot.count);
			}
		}
		chest.close();
		sendLog("Inventory Full", harvestedName + " is now in the chest.");
	} else {
		bot.lookAt(chestBlock.position);
		bot.setControlState('forward', true);
	}
}

async function farmLoop() {
	let harvest = readyCrop();
	if (harvest) {
		bot.lookAt(harvest.position);
		try {
			if (bot.entity.position.distanceTo(harvest.position) < 3) {
				bot.setControlState('forward', false);
				if (!bot.heldItem || bot.heldItem.name != pickaxe) await bot.equip(mcData.itemsByName[pickaxe].id);
				await bot.dig(harvest);
			} else {
				bot.setControlState('forward', true);
			}
		} catch(err) {
			sendLog("Internal Error", err);
		}
	} else {
		let entityDrop = readyDrop();
		if(entityDrop){
			if (bot.entity.position.distanceTo(entityDrop.position) <= 15) {
				bot.lookAt(entityDrop.position);
				try {
					if (bot.entity.position.distanceTo(entityDrop.position) < 0) {
						bot.setControlState('forward', false);
					} else {
						bot.setControlState('forward', true);
					}
				} catch(err) {
					sendLog("Internal Error", err);
				}
			} else {
				bot.setControlState('forward', false);
			}
		} else {
			bot.setControlState('forward', false);
		}
	} 
}

function readyCrop() {
	return bot.findBlock({
		matching: (blk)=>{
			if(blk.name == harvestName){
				var harvest = blk.name == harvestName && blk.metadata >= metadata;
				return(harvest);
			}
		}
	});
}

function readyDrop() {
	return bot.nearestEntity(entity => entity.entityType === 41);
}

async function sendLog(title, message) {
	let res = await axios.post(info.diswebhook, {
		"content": "@everyone",
		  "embeds": [{
			  "title": title,
			  "description": message,
			  "color": 5814783
		}]
	  }).catch((error) => {
		return false;
	  });
	  return res.data;
}