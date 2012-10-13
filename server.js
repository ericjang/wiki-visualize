//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , port = (process.env.PORT || 8081)
		, host = 'localhost'
		, article_cache = {}
		, request = require('request')
		, cheerio = require('cheerio');//for caching already-retrieved articles.
	
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



//Setup Socket.IO
var io = io.listen(server);
io.sockets.on('connection', function(socket){
  console.log('Client Connected');
  
	
	socket.on('get articles', function(articles_array){
		//articles requested. > general purpose handling for single article or even multiple.
		//function takes in an array of article ids and returns whole article objects.
		
		//implement the cache storage logic later. Scrape Wikipedia for now.
		
		for (var i in articles_array) {
			var article_url = articles_array[i];
			request('http://en.wikipedia.org' + article_url, function (error, response, body) {
			  if (!error && response.statusCode == 200) {
			    
					//parse it to make sure it is a valid structure > handle redirects if necessary
					
					var $ = cheerio.load(body);
					
					
					//perhaps port this over to a function later.
					
					var article_limit = 30
						,	children = {}
						, rellinks = $('#mw-content-text .rellink a')//35 -> give priority to these nodes
						, links = $('#mw-content-text p > a')
						, numrellinks = rellinks.length
						, numlinks = links.length;//27 <- be careful of order of selector and descendant annoying selectors
					
						//add all the rellinks
						for (var i in rellinks) {
							var linkURL = $(links[i]).attr('href');
							var title = $(links[i]).attr('title'); 
							
							//make sure the link begins with /wiki/
							var re = new RegExp("^(/wiki/)");
							
							//make sure it is not self
							if (linkURL !== article_url && linkURL.match(re) !== null) {
								children[linkURL] = {'title' : title};
							}	
						}
						
						//do something similar but don't add any more if article has already > 30 links
						
						for (var i = 0; i < article_limit - numrellinks; i++) {
							var linkURL = $(links[i]).attr('href');
							var title = $(links[i]).attr('title'); 
							
							//make sure the link begins with /wiki/
							var re = new RegExp("^(/wiki/)");
							
							//make sure it is not self
							if (linkURL !== article_url && linkURL.match(re) !== null) {
								children[linkURL] = {'title' : title};
							}
							
						}//end for loop
						
					debugger;
					
					var data = {
							'title' : $('h1').text()
						,	'childOf' : article_url
						, 'children' : children
						, 'count' : numrellinks + numlinks//probably correlate to size later
					};
					
					//emit each article one at a time. Better asynchronous flow.
					socket.emit('article',data);
			  }
			});
			
		}
		
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
