var cheerio = require('cheerio');
var fs = require('fs-extra');
var redis = require("redis");
var vsprintf = require('sprintf-js').vsprintf

var client = redis.createClient({
	host: '0.0.0.0'
});
var file = process.argv[2];

var echo = function(str) {
	console.log(str);
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

			player.hash = player.status + player.date + player.injury + player.returns;

			list.push(player);
		});
	});

	return list;
}

var insertPlayers = function(players, cb) {
	for (var i = 0; i < players.length; i++) {
		player = players[i];
		key = 'player:' + player.id;

		echo(vsprintf("searching: %s", [key]));
		client.get(key, function(err, res) {
			if (err) echo(err);
			if (res == null) {
				echo(vsprintf('set: %s %s', [this.playerKey, this.playerName]));
				client.set(this.playerKey, this.playerName, function(err, result) {
					echo(err);
					echo(result);
				});
			}
		}.bind({
			playerKey: key,
			playerName: player.name
		}));
	}
};

fs.readFile(file, (err, data) => {
	if (err) throw err;

	var players = getPlayers(data.toString());
	insertPlayers(players);
	
});

