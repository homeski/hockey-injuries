var async = require('async');
var auth = require('./mail-auth.json');
var cheerio = require('cheerio');
var fs = require('fs-extra');
var handlebars = require('handlebars');
var nodemailer = require('nodemailer');
var redis = require("redis");
var vsprintf = require('sprintf-js').vsprintf;

var client = redis.createClient({
	host: '0.0.0.0'
});
var file = process.argv[2];

var DEBUG,
	EMAIL = false;

while(true) {
	shift = process.argv.pop();

	switch (shift) {
		case 'd':
			DEBUG = shift === 'd' ? true : false;
			continue;
		case 'e':
			EMAIL = shift === 'e' ? true : false;
			continue;
	}

	if (process.argv.length == 0) break;
}

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
					// a new injured player is found
					//	treat this as an update
					changes.push(this.player);

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
		if (err) console.log(err);

		cb(changes);
	});
};

var sendmail = function(message) {
	// setup e-mail data with unicode symbols
	var mailOptions = {
		from: '"homeski" <homeski2@gmail.com>', // sender address
		to: 'homeski@cox.net', // list of receivers
		subject: 'hockey injuries', // Subject line
		text: message, // plaintext body
		html: message // html body
	};

	// create reusable transporter object using the default SMTP transport
	var transporter = nodemailer.createTransport(vsprintf('smtps://%s:%s@smtp.gmail.com', [auth.user, auth.pass]));

	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			return console.log(error);
		}

		echo('Message sent: ' + info.response);
	});
}

function template(delta) {
	source = `
		<ul>
			{{#each players}}
			<li>{{name}}</li>
			{{/each}}
		</ul>
		`
	var template = handlebars.compile(source);

	return(template(delta));
	
}

fs.readFile(file, (err, data) => {
	if (err) throw err;

	var players = getPlayers(data.toString());
	insertPlayers(players, function(delta) {
		echo(delta);
		
		if (EMAIL)
			sendmail(template({
				players: delta
			}));
		
		client.quit();
	});
});

