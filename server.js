//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , port = (process.env.PORT || 8081)
		, host = 'localhost'
		, article_cache = {}
		, request = require('request')
		, cheerio = require('cheerio')
		, agents = require('agents');//my custom user agents module
	
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



function parse_article($,parent_url) {
	var article_limit = 30
		,	children_dict = {}
		, children = []
		, rellinks = $('#mw-content-text .rellink a')//35 -> give priority to these nodes
		, links = $('#mw-content-text p > a')
		, numrellinks = rellinks.length
		, numlinks = links.length;//27 <- be careful of order of selector and descendant annoying selectors
		
		if (numrellinks !== 0) {
			//add all the rellinks
			for (var i = 0; i < numrellinks; i++) {
				var linkURL = $(rellinks[i]).attr('href');
				var title = $(rellinks[i]).attr('title'); 
							
				//make sure the link begins with /wiki/
				var re = new RegExp("^(/wiki/)");
				
				
				//make sure it is not identical to parent url
				if (linkURL !== parent_url && linkURL.match(re) !== null) {
					children_dict[linkURL] = {'name':title, 'url':linkURL, 'childOf':parent_url, 'size':1000};//accounts for duplicates!
				}	
			}
		}
		
		
		if (numlinks !== 0) {
			//do something similar with the rest of the links but don't add any more if article has already > 30 links
			for (var i = 0; (i < article_limit - numrellinks) && (i < numlinks); i++) {
				var linkURL = $(links[i]).attr('href')
					, title = $(links[i]).attr('title');
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
		
		debugger;//check children for titles...
						
		
		var article = {
				'name' : $('h1').text()
			, 'url' : parent_url
			, 'children' : children
			, 'count' : numrellinks + numlinks//probably correlate to size later
		};
		
		return article;//general article object. The search/random/get new children functions each make different assumptions on it.
}


function parse_disambig_article($,parent_url) {
	//parse disambiguation articles. they have a different selector format and no rellinks
	var article_limit = 30
		,	children_dict = {}
		, children = []
		, redirlinks = $('#mw-content-text li a')
		, numlinks = redirlinks.length;//27 <- be careful of order of selector and descendant annoying selectors
		
		if (numlinks !== 0) {
			//do something similar with the rest of the links but don't add any more if article has already > 30 links
			for (var i = 0; (i < article_limit) && (i < numlinks); i++) {
				
				var linkURL = $(redirlinks[i]).attr('href')
					, title = $(redirlinks[i]).attr('title');
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
		
		debugger;//check children for titles...
		var article = {
				'name' : $('h1').text()
			, 'url' : parent_url
			, 'children' : children
			, 'count' : numlinks//probably correlate to size later
		};
		
		return article;//general article object. The search/random/get new children functions each make different assumptions on it.
}


//Setup Socket.IO
var io = io.listen(server, {log:false});//no logging

io.sockets.on('connection', function(socket){
  console.log('Client Connected');
  
	socket.on('search',function(query){
		//inline function may be expensive...
		function search(url) {
			request({'uri':url,'headers':{'User-Agent':agents.randomAgentString()}},function(error,response,body){
				//code here has to discern whether this is an actual page or not, in addition to the url
				var $ = cheerio.load(body);
				if ($('.mw-search-nonefound').length !== 0) {
					//none found, no search results! 
					socket.emit('none found',query);
					return 0;
				}
				var search_results = $('.mw-search-results li');
				if (search_results.length !== 0) {
					//search results exist! pick the first one that comes up
					var new_query = 'http://en.wikipedia.org/wiki/Special:Search?search='+$('.mw-search-results li a').attr('href');+'&go=Go'
					console.log('searching new query',new_query);
					search(new_query);//ought to be correct now...
				}
				//send disambiguation pages as their own article of sorts.
				if ('#disambigbox') {
					var article = parse_disambig_article($,response.request.uri.href);
					socket.emit('article',article);
					return 1;
				}
				
				//otherwise, article is probably a perfect match
				var article = parse_article($,response.request.uri.href);
				console.log(article.name);
				socket.emit('article',article);//like the random article, send the whole thing.
				return 1;
			});
		}
		
		search('http://en.wikipedia.org/wiki/Special:Search?search='+query+'&go=Go');
	});
	
	socket.on('get random article',function(){
		request({'uri':'http://en.wikipedia.org/wiki/Special:Random','headers':{'User-Agent': agents.randomAgentString()}},function(error,response,body){
			var article = parse_article(cheerio.load(body),response.request.uri.href);
			socket.emit('article', article);//the whole article is emitted and upon loading in client, all children displayed immediately.
			debugger;
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
             ,analyticssiteid: 'UA-35545838-1' 
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
