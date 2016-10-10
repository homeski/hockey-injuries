var cheerio = require('cheerio');
var fs = require('fs-extra');

var file = process.argv[2];

var echo = function(str) {
	console.log(str);
}

var getPlayers = function(html) {
	$ = cheerio.load(html);

	teams = $('#cp1_pnlInjuries').find('.pb');
	
	teams.each(function() {
		team = $(this).find('.player').text();
		players = $(this).find('tr').slice(1);

		echo('-- ' + team + ' --');

		players.each(function() {
			attrs = $(this).find('td');

			var name = $(attrs[0]).text();
			echo(name);
		});

		echo("");
	});
}

fs.readFile(file, (err, data) => {
	if (err) throw err;

	getPlayers(data.toString());
});

