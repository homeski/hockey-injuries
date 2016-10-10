var async = require('async');
var cheerio = require('cheerio');
var fs = require('fs-extra');
var redis = require("redis");
var vsprintf = require('sprintf-js').vsprintf

var client = redis.createClient({
	host: '0.0.0.0'
});
var file = process.argv[2];
DEBUG = process.argv[3] === 'd' ? true : false;

var echo = function(str) {
	if (DEBUG) console.log(str);
}

client.on("error", function (err) {
	console.log("Error " + err);
});

var getPlayers = function(html) {
	$ = cheerio.load(html);

	list = [];
	teams = $('#cp1_pnlInjuries').find('.pb');
	
	teams.each(function() {
		team = $(this).find('.player').text();
		players = $(this).find('tr').slice(1);

		players.each(function() {
			attrs = $(this).find('td');

			player = {
				id:      $(attrs[1]).find('.playercard').attr('id'),
				key:		'player:' + $(attrs[1]).find('.playercard').attr('id'),
				hash:    null,
				team:    team,
				name:    $(attrs[0]).text(),
				info:    $(attrs[1]).find('.report').text(),
				pos:     $(attrs[2]).text(),
				status:  $(attrs[3]).text(),
				date:    $(attrs[4]).text(),
				injury:  $(attrs[5]).text(),
				returns: $(attrs[6]).text()
			};

			player.hash = player.info + player.status + player.date + player.injury + player.returns;

			list.push(player);
		});
	});

	return list;
}

var insertPlayers = function(players, cb) {
	changes = [];
	// For each player in HTML
	async.each(players, function(player, callback) {
		echo(player.key);
		// Find it's key in redis
		client.get(player.key, function(err, res) {
			// If not found then add the key
			if (res == null) {
				client.set(this.player.key, JSON.stringify(this.player), function(err, result) {
					callback();
				});
			// If found then check for hash difference
			} else {
				res = JSON.parse(res);

				// player hash has changed
				//	treat this as an update
				if (res.hash !== this.player.hash) {
					changes.push(res);
				}
				callback();
			}

		}.bind({
			player: player
		}));
	},
	function(err) {
		if (err) echo(err);

		cb(changes);
	});
};

fs.readFile(file, (err, data) => {
	if (err) throw err;

	var players = getPlayers(data.toString());
	insertPlayers(players, function(delta) {
		echo(delta);
		client.quit();
	});
});

