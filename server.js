//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , port = (process.env.PORT || 8081)
		, host = 'localhost'
		, article_cache = {}
		, request = require('request')
		, cheerio = require('cheerio')
		, agent_counter = 0;//for caching already-retrieved articles.
	
//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "shhhhhhhhh!"}));
    server.use(connect.static(__dirname + '/static'));
    server.use(server.router);
});

//setup the errors
server.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: { 
                  title : '404 - Not Found'
                 ,description: ''
                 ,author: ''
                 ,analyticssiteid: 'XXXXXXX' 
                },status: 404 });
    } else {
        res.render('500.jade', { locals: { 
                  title : 'The Server Encountered an Error'
                 ,description: ''
                 ,author: ''
                 ,analyticssiteid: 'XXXXXXX'
                 ,error: err 
                },status: 500 });
    }
});
server.listen( port);


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
	'BlogsNowBot, V 2.01 (+http://www.blogsnow.com/) '];
	agent_counter += 1;
	return agents[agent_counter % agents.length];
	
	//add more user agents later. that might help...
}

function parse_article($,parent_url) {
	var article_limit = 30
		,	children_dict = {}
		, children = []
		, rellinks = $('#mw-content-text .rellink a')//35 -> give priority to these nodes
		, links = $('#mw-content-text p > a')
		, numrellinks = rellinks.length
		, numlinks = links.length;//27 <- be careful of order of selector and descendant annoying selectors
		
		if (rellinks.length !== 0) {
			//add all the rellinks
			for (var i = 0, ii = rellinks.length; i < ii; i++) {
				var linkURL = $(rellinks[i]).attr('href');
				var title = $(rellinks[i]).attr('title'); 
							
				//make sure the link begins with /wiki/
				var re = new RegExp("^(/wiki/)");
				
				console.log(linkURL);
				
				//make sure it is not identical to parent url
				if (linkURL !== parent_url && linkURL.match(re) !== null) {
					children_dict[linkURL] = {'name':title, 'url':linkURL, 'childOf':parent_url, 'size':1000};//accounts for duplicates!
				}	
			}
		}
		
		
		if (links.length !== 0) {
			//do something similar with the rest of the links but don't add any more if article has already > 30 links
			for (var i = 0; (i < article_limit - numrellinks) && (i < links.length); i++) {
				var linkURL = $(links[i]).attr('href');
				//make sure the link begins with /wiki/
				var re = new RegExp("^(/wiki/)");
							
				//make sure children are not identical to the url of its parent page it resides on
				if (linkURL !== parent_url && linkURL.match(re) !== null) {
					children_dict[linkURL] = {'name':title, 'url':linkURL, 'childOf':parent_url, 'size':1000};
				}
				
			}
			
			//add all the children in the dict to the array
			for (var i in children_dict) {
				children.push(children_dict[i]);
			}
		}
						
		
		var article = {
				'name' : $('h1').text()
			, 'url' : parent_url
			, 'children' : children
			, 'count' : numrellinks + numlinks//probably correlate to size later
		};
		
		return article;//general article object. The search/random/get new children functions each make different assumptions on it.
}

//Setup Socket.IO
var io = io.listen(server);

io.sockets.on('connection', function(socket){
  console.log('Client Connected');
  
	socket.on('search',function(query){
		request({'uri':'http://en.wikipedia.org/wiki/Special:Search?search='+query+'&go=Go','headers':{'User-Agent':randomAgent()}},function(error,response,body){
			
			console.log(body);
			//code here has to discern whether this is an actual page or not, in addition to the url
			var $ = cheerio.load(body);
			
			//check if none found
			if ($('.mw-search-nonefound').length !== 0) {
				//none found! 
				socket.emit('none found',query);
			}
			
			var article = parse_article($,response.request.uri.href);
			console.log(article.name);
			socket.emit('article',article);//like the random article, send the whole thing.
		});
		
	});
	
	socket.on('get random article',function(){
		request({'uri':'http://en.wikipedia.org/wiki/Special:Random','headers':{'User-Agent': randomAgent()}},function(error,response,body){
			var article = parse_article(cheerio.load(body),response.request.uri.href);
			socket.emit('article', article);//the whole article is emitted and upon loading in client, all children displayed immediately.
		});
	});
	
	socket.on('get new children', function(parent_url){
		//fetch whole articles and send new leaf nodes back to client. this is much less computationally expensive and code-cluttering.
		request('http://en.wikipedia.org' + parent_url, function(error,response,body){
			debugger;
			if (!error && response.statusCode == 200) {
				var article = parse_article(cheerio.load(body),parent_url);
				//now fetch new article nodes each child of that article and send them one by one. they will each get joined to the somewhat-empty leaf node in the client.
				debugger;
				for (var i in article.children) {
					socket.emit('article',article.children[i]);
				}
				
			}
		});
	});
	
	
	
  socket.on('disconnect', function(){
    console.log('Client Disconnected.');
  });
	
	
});


///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/', function(req,res){
  res.render('index.jade', {
    locals : { 
              title : 'Mutant Platato'
             ,description: 'Wikipedia Knowledge Graph'
             ,author: 'Eric Jang'
             ,analyticssiteid: 'XXXXXXX' 
            }
  });
});


server.get('/about',function(req,res){
	res.render('about.jade',{
		locals: {
				title : 'Mutant Platato : About'
			, description : 'About Page'
			, author : 'Eric Jang'
		}
	});
});


//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on http://0.0.0.0:' + port );
