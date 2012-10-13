agent_counter = 0;

//a bunch of random user agents and browsers

function randomAgent(){
	//cycle through user agents
	
	var agents = ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
	'( Robots.txt Validator http://www.searchengineworld.com/cgi-bin/robotcheck.cgi )',
	'Amfibibot/0.07 (Amfibi Robot; http://www.amfibi.com; agent@amfibi.com) ',
	'Googlebot/2.X (+http://www.googlebot.com/bot.html)',
	'KIT-Fireball/2.0 libwww/5.0a',
	'FyberSpider (+http://www.fybersearch.com/fyberspider.php)',
	'ABCdatos BotLink/1.0.2 (test links)',
	'Big Brother (http://pauillac.inria.fr/~fpottier/)',
	'BigCliqueBOT/1.03-dev (bigclicbot; http://www.bigclique.com; bot@bigclique.com) ',
	'BlogsNowBot, V 2.01 (+http://www.blogsnow.com/)',
	'A1 Keyword Research/1.0.2 (+http://www.micro-sys.dk/products/keyword-research/) miggibot/2007.03.27 ',
	'Acoon Robot v1.52 (http://www.acoon.de) ',
	'ActiveWorlds/3.xx (xxx) ',
	'Aleksika Spider/1.0 (+http://www.aleksika.com/) ',
	'Amfibibot/0.07 (Amfibi Robot; http://www.amfibi.com; agent@amfibi.com) ',
	'AnzwersCrawl/2.0 (anzwerscrawl@anzwers.com.au;Engine) ',
	'asked/Nutch-0.8 (web crawler; http://asked.jp; epicurus at gmail dot com) ',
	'augurnfind V-1.x ',
	'BDNcentral Crawler v2.3 [en] (http://www.bdncentral.com/robot.html) (X11; I; Linux 2.0.44 i686) ',
	'BebopBot/2.5.1 ( crawler http://www.apassion4jazz.net/bebopbot.html ) ',
	'Biyubi/x.x (Sistema Fenix; G11; Familia Toledo; es-mx) ',
	'BlogPulseLive (support@blogpulse.com) '
	];
	agent_counter += 1;
	return agents[agent_counter % agents.length];
	
	//add more user agents later. that might help...
}


module.exports = randomAgent;