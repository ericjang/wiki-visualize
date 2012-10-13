/* Author: Eric Jang
*/

$(document).ready(function() {   

	var MODE = (function(){
		var c = {};
		c.modes = ['user','waiting','data'];
		c.mode = c.modes[0];
		
		c.set_user = function() {this.mode = c.modes[0];};
		c.set_waiting = function() {
			this.mode = c.modes[1];
			//disable search box and replace #control div with ajax loader
			$('#searchbox').attr('disabled','disabled');
			$('#controls').replaceWith('<img src="images/ajax-loader.gif" style="display:block;margin:auto">');
		};
		c.set_data = function() {
			this.mode = c.modes[2];
			
			//it would probably be convenient to make these variables accessible in a global scope for the socket.io to access
			
			//enter into data display mode
			$('#spacer').attr('style','height:10px')
			$('#user').replaceWith('<div id="data" class="row-fluid"><div id="chart"></div></div>');
			
			var width = 1000,
			    height = 600,
			    node,
			    link,
			    root;

			var force = d3.layout.force()
			    .on("tick", tick)
			    .charge(function(d) { return d._children ? -d.size / 100 : -30; })
			    .linkDistance(function(d) { return d.target._children ? 80 : 30; })
			    .size([width, height]);

			var vis = d3.select("#chart").append("svg")
			    .attr("width", width)
			    .attr("height", height);

				
				
			//load the data as it comes instead of doing json.
			
			var root = {
					fixed : true
				, x : width / 2
				, y : height / 2
			}
			
			update();
			
			
			function update() {
			  var nodes = flatten(root),
			      links = d3.layout.tree().links(nodes);

			  // Restart the force layout.
			  force
			      .nodes(nodes)
			      .links(links)
			      .start();

			  // Update the links…
			  link = vis.selectAll("line.link")
			      .data(links, function(d) { return d.target.id; });

			  // Enter any new links.
			  link.enter().insert("line", ".node")
			      .attr("class", "link")
			      .attr("x1", function(d) { return d.source.x; })
			      .attr("y1", function(d) { return d.source.y; })
			      .attr("x2", function(d) { return d.target.x; })
			      .attr("y2", function(d) { return d.target.y; });

			  // Exit any old links.
			  link.exit().remove();

			  // Update the nodes…
			  node = vis.selectAll("circle.node")
			      .data(nodes, function(d) { return d.id; })
			      .style("fill", color);

			  node.transition()
			      .attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 10; });

			  // Enter any new nodes.
			  node.enter().append("circle")
			      .attr("class", "node")
			      .attr("cx", function(d) { return d.x; })
			      .attr("cy", function(d) { return d.y; })
			      .attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 10; })
			      .style("fill", color)
			      .on("click", click)
			      .call(force.drag);

			  // Exit any old nodes.
			  node.exit().remove();
			}

			function tick() {
			  link.attr("x1", function(d) { return d.source.x; })
			      .attr("y1", function(d) { return d.source.y; })
			      .attr("x2", function(d) { return d.target.x; })
			      .attr("y2", function(d) { return d.target.y; });

			  node.attr("cx", function(d) { return d.x; })
			      .attr("cy", function(d) { return d.y; });
			}

			// Color leaf nodes orange, and packages white or blue.
			function color(d) {
			  return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
			}

			// Toggle children on click.
			function click(d) {
			  if (d.children) {
					//hiding - leave this be!
			    d._children = d.children;
			    d.children = null;
			  } else if (d._children) {
					//expansion of big bubble into smaller bubbles
			    d.children = d._children;
			    d._children = null;
			  } else {
			  	//no exposed or hidden children > must be a leaf node!
					console.log('requesting new article...');
					var articles_array = [];
					
					//TODO
					socket.emit('get article',['ergot']);
			  }
				//run the update function!
			  update();
			}
			
			

			// Returns a list of all nodes under the root.
			//do i really need this function?
			function flatten(root) {
			  var nodes = [], i = 0;

			  function recurse(node) {
			    if (node.children) node.size = node.children.reduce(function(p, v) { return p + recurse(v); }, 0);
			    if (!node.id) node.id = ++i;
			    nodes.push(node);
			    return node.size;
			  }

			  root.size = recurse(root);
			  return nodes;
			}
			
			
		};
		return c;
	})();
	
	
	
  var socket = io.connect();
	
	$("[rel=tooltip]").tooltip({'placement':'bottom'});
	
	$('#searchbox').keypress(function(e){
	    if (e.which == 13){
	       $("#search").click();
	    }
	});
	
	//bind submit functions to buttons (and enter key for search)
	$('#search').bind('click', function(){
		//get value of input, clear the input, and then emit it
		var article = "anarchism";//TODO : remove this
		socket.emit('search',article);
		MODE.set_waiting();
		//temp:
		MODE.set_data();
	});
	
	$('#random').bind('click',function(){
		var test_articles = ['Anarchism','Paul_Erdos'];
		console.log('sending initial request...');
		socket.emit('get articles',test_articles);
		MODE.set_waiting();
	});
	
	socket.on('article',function(article){
		//if in user mode, ignore.
		if (MODE.mode === "user") {return 0;}
		if (MODE.mode === "waiting") { MODE.set_data();	return 0; }
		
		//must be already in data mode. add article to the d3 layout
		
		/*
		some things to check for : 
		- if node is already in graph > TOO BAD, add it anyway 
		
		
		
		*/
		
		console.log('received article...', article);
	});
	
	
	
});