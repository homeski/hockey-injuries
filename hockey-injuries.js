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
				// a new injured player is found
				// treat this as an update
				changes.push(this.player);

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
<html><head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Simple Transactional Email</title>
    <style media="all" type="text/css">
    @media all {
      .btn-primary table td:hover {
        background-color: #34495e !important;
      }
      .btn-primary a:hover {
        background-color: #34495e !important;
        border-color: #34495e !important;
      }
    }
    
    @media all {
      .btn-secondary a:hover {
        border-color: #34495e !important;
        color: #34495e !important;
      }
    }
    
    @media only screen and (max-width: 620px) {
      table[class=body] h1 {
        font-size: 28px !important;
        margin-bottom: 10px !important;
      }
      table[class=body] h2 {
        font-size: 22px !important;
        margin-bottom: 10px !important;
      }
      table[class=body] h3 {
        font-size: 16px !important;
        margin-bottom: 10px !important;
      }
      table[class=body] p,
      table[class=body] ul,
      table[class=body] ol,
      table[class=body] td,
      table[class=body] span,
      table[class=body] a {
        font-size: 16px !important;
      }
      table[class=body] .wrapper,
      table[class=body] .article {
        padding: 10px !important;
      }
      table[class=body] .content {
        padding: 0 !important;
      }
      table[class=body] .container {
        padding: 0 !important;
        width: 100% !important;
      }
      table[class=body] .header {
        margin-bottom: 10px !important;
      }
      table[class=body] .main {
        border-left-width: 0 !important;
        border-radius: 0 !important;
        border-right-width: 0 !important;
      }
      table[class=body] .btn table {
        width: 100% !important;
      }
      table[class=body] .btn a {
        width: 100% !important;
      }
      table[class=body] .img-responsive {
        height: auto !important;
        max-width: 100% !important;
        width: auto !important;
      }
      table[class=body] .alert td {
        border-radius: 0 !important;
        padding: 10px !important;
      }
      table[class=body] .span-2,
      table[class=body] .span-3 {
        max-width: none !important;
        width: 100% !important;
      }
      table[class=body] .receipt {
        width: 100% !important;
      }
    }
    
    @media all {
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 100%;
      }
      .apple-link a {
        color: inherit !important;
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
    }

    @media all {
      #players tr:nth-child(even) {
         background-color: #dddddd !important;
      }

      #players tr:nth-child(odd) {
         background-color: #eeeeee !important;
      }

      #players {
         margin-bottom: 10px !important;
      }
    }
    </style>
  </head>
  <body class="" style="font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #f6f6f6; margin: 0; padding: 0;">
    <table border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background-color: #f6f6f6;" width="100%" bgcolor="#f6f6f6">
      <tbody><tr>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
        <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; Margin: 0 auto !important; max-width: 580px; padding: 10px; width: 580px;" width="580" valign="top">
          <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

            <!-- START CENTERED WHITE CONTAINER -->
            <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">This is preheader text. Some clients will show this text as a preview.</span>
            <table class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background: #fff; border-radius: 3px;" width="100%">

              <!-- START MAIN CONTENT AREA -->
              <tbody><tr>
                <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">
                    <tbody>
                     <tr>
                        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                        </td>
                     </tr>
                     <tr>
                        <td>
                           <table id="players">
                              <tbody>
                                 {{#each players}}
                                 <tr>
                                    <td>{{name}}</td>
                                    <td>{{pos}}</td>
                                    <td>{{status}}</td>
                                    <td>{{date}}</td>
                                    <td>{{injury}}</td>
                                    <td>{{return}}</td>                                    
                                 </tr>
                                 <tr>
                                    <td colspan="6">{{info}}</td>
                                 </tr>
                                 {{/each}}
                              </tbody>
                           </table>
                        </td>
                     </tr>
                     <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;"></p>  
                     <tr>
                        <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;" valign="top">
                           <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
                              <tbody>
                                 <tr>
                                    <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; background-color: #3498db; border-radius: 5px; text-align: center;" valign="top" bgcolor="#3498db" align="center"> <a href="http://htmlemail.io" target="_blank" style="display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-transform: capitalize; border-color: #3498db;">Call To Action</a>
                                    </td>
                                 </tr>
                              </tbody>
                           </table>
                        </td>
                    </tr>
                  </tbody></table>
                </td>
              </tr>

              <!-- END MAIN CONTENT AREA -->
              </tbody></table>

            <!-- START FOOTER -->
            <div class="footer" style="clear: both; padding-top: 10px; text-align: center; width: 100%;">
              <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">
                <tbody><tr>
                  <td class="content-block" style="font-family: sans-serif; vertical-align: top; padding-top: 10px; padding-bottom: 10px; font-size: 12px; color: #999999; text-align: center;" valign="top" align="center">
                    <span class="apple-link" style="color: #999999; font-size: 12px; text-align: center;">Company Inc, 3 Abbey Road, San Francisco CA 94102</span>
                    <br> Don't like these emails? <a href="http://i.imgur.com/CScmqnj.gif" style="text-decoration: underline; color: #999999; font-size: 12px; text-align: center;">Unsubscribe</a>.
                  </td>
                </tr>
                <tr>
                  <td class="content-block powered-by" style="font-family: sans-serif; vertical-align: top; padding-top: 10px; padding-bottom: 10px; font-size: 12px; color: #999999; text-align: center;" valign="top" align="center">
                    Powered by <a href="http://htmlemail.io" style="color: #999999; font-size: 12px; text-align: center; text-decoration: none;">HTMLemail</a>.
                  </td>
                </tr>
              </tbody></table>
            </div>

            <!-- END FOOTER -->
            
<!-- END CENTERED WHITE CONTAINER --></div>
        </td>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
      </tr>
    </tbody></table>
  
</body></html>
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

