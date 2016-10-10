var cheerio = require('cheerio');
var fs = require('fs-extra');
var vsprintf = require('sprintf-js').vsprintf

var file = process.argv[2];

var echo = function(str) {
	console.log(str);
}

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

fs.readFile(file, (err, data) => {
	if (err) throw err;

	var players = getPlayers(data.toString());

	for (var i = 0; i < players.length; i++) {
		player = players[i];
		echo(vsprintf("%s %s %s", [player.name, player.id, player.hash]));
		echo(player);
	}
});

