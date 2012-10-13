/* Author: Eric Jang
*/

$(document).ready(function() {   
	$("[rel=tooltip]").tooltip({'placement':'bottom'});
	
	
	
	var width = 1000,
	    height = 600,
	    node,
	    link,
	    root,
			first_node = true,
			waiting_parents = {},
			force,
			viz;

	function update() {
	  nodes = flatten(root),//wasteful recursive function, but oh well.
	  links = d3.layout.tree().links(nodes);

	  // Restart the force layout.
	  force
	      .nodes(nodes)
	      .links(links)
				.linkDistance(50)//write a function for this maybe?
				.charge(-800)
				.friction(.6)
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
	  node = vis.selectAll(".node")
	      .data(nodes, function(d) { return d.id; });
//	      .style("fill", color);

	  node.transition()
	      .attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 10; });

	  // Enter any new nodes.
		
		
		
		node.enter().append("g")
				.attr("class","node")
		    .attr("cx", function(d) { return d.x; })
		    .attr("cy", function(d) { return d.y; })
				.call(force.drag);
		
		node.append("text")
	      .attr("dx", 10)
	      .attr("dy", ".25em")
				.attr("font-size","11")
	      .text(function(d) { return d.name });
		
		node.append("circle")
				.attr("class", "node")
		    .attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 7; })
		    .style("fill", color)
		    .on("click", click);
		
		
	  // Exit any old nodes.
	  node.exit().remove();
	}
			

	function tick() {
	  link.attr("x1", function(d) { return d.source.x; })
	      .attr("y1", function(d) { return d.source.y; })
	      .attr("x2", function(d) { return d.target.x; })
	      .attr("y2", function(d) { return d.target.y; });

		node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
	  //node.attr("cx", function(d) { return d.x; })
	  //    .attr("cy", function(d) { return d.y; });
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
	  	//no exposed or hidden children > must be a leaf node already!
			
			//save the listening parent node so that we can add children to it later.
			d.children = [];
			waiting_parents[d.url] = d;
					
			socket.emit('get new children',d.url);
	  }
		//run the update function!
	  update();
	}
			
	// Returns a list of all nodes under the root.
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
			
	function add_to_graph(node){
		for (var i in waiting_parents) {
			if (node.childOf === waiting_parents[i].url) {
				//found my parent! adding to parent should correctly add it to root node...
				waiting_parents[i].children.push(node);//immediately visible
				return 1;
			}
		}
	}
			
	

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
			$('.tooltip').hide();//hack to get rid of rogue tooltip
		};
		c.set_data = function() {
			this.mode = c.modes[2];
			
			//it would probably be convenient to make these variables accessible in a global scope for the socket.io to access
			
			//enter into data display mode
			$('#spacer').attr('style','height:10px')
			$('#user').replaceWith('<div id="data" class="row-fluid"><div id="chart"></div></div>');
			
			force = d3.layout.force()
			    .on("tick", tick)
			    .charge(function(d) { return d._children ? -d.size / 100 : -30; })
			    .linkDistance(function(d) { return d.target._children ? 80 : 30; })
			    .size([width, height]);

			vis = d3.select("#chart").append("svg")
			    //.attr("width", width) <-- do unlimited width/height!
			    //.attr("height", height);
		};
		return c;
	})();
	
	
	
	
  var socket = io.connect();
	
	$('#searchbox').keypress(function(e){
	    if (e.which == 13){
	       $("#search").click();
	    }
	});
	
	//bind submit functions to buttons (and enter key for search)
	$('#search').bind('click', function(){
		//get value of input, clear the input, and then emit it
		var query = $('#searchbox').val();
		socket.emit('search',query);
		MODE.set_waiting();
	});
	
	$('#random').bind('click',function(){
		socket.emit('get random article','');
		MODE.set_waiting();
	});
	
	socket.on('article',function(article){
		//set into data mode if necessary
		if (MODE.mode === "user" || MODE.mode === "waiting") {MODE.set_data();}
		
		if (first_node) {//if node is first to be added, it becomes root
			root = article;
			first_node = false;
			update();
		} else {
			add_to_graph(article);
			update();
		}
		
	});
	
	socket.on('none found',function(query){
		alert('Sorry, we couldn\'t find what you were looking for... ');
	});
	
});