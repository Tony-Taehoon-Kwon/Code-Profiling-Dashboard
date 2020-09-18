var nodeColorDark =  ["#f59", "#59f", "#9f5", "#a7f"];
var nodeColorLight = ["#c59", "#59c", "#9c5", "#a7c"];


var scaledata = [.0001, 0.001, 0.008, 0.027, 0.064, 0.125, 0.216, 0.343, 0.512, 0.729, 1];

var container = document.getElementById('function_tree');

// Set the dimensions and margins of the diagram
var margin = {top: 20, right: 90, bottom: 60, left: 90},
    width = container.clientWidth - margin.left - margin.right,
    height = container.clientHeight - margin.top - margin.bottom;
	delta_dist = width / 1000;

	
var formatDecimal = d3.format(".3f");
	
var tooltip = d3.select('#function_tree').append('div')
         .style('position', 'fixed')
         .style('background', '#f26b2c')		
         .style('padding', '10px')
         .style('color', '#ffffff')			
         .style('border', '1px #333 solid')		
         .style('border-box', '50px')		
         .style('opacity', '0')
         .style('text-align', 'center');	

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg = d3.select("#function_tree").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
	.call(d3.zoom()
	.scaleExtent([1,4]) // limit scale to full size or 4x size.
    .translateExtent([[0,0],[width,height]])  // limit pan to original SVG dimensions
	.on("zoom", function () {
    svg.attr("transform", d3.event.transform)
    }))
    .append("g")
    .attr("transform", "translate("
          + margin.left + "," + margin.top + ")");
		  
		  
var scale = d3.scaleLog()
              .domain([100.0 * d3.min(scaledata), 100.0 * d3.max(scaledata)])
              .range([height - .1 * margin.bottom, 0]);

var yAxis  = d3.axisLeft(scale);

var y_axis = svg.append("g")
    .attr("id", "y_axis")
    .attr("transform", "translate(-20,0)")
    .call(yAxis)
	  // text label for the y axis
  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Percent Function Time Per Frame");  

var i = 0,
    duration = 0,
    root = [];

// declares a tree layout and assigns the size
var treemap = d3.tree().size([height - .1 * margin.bottom, width]);

var curr_frame = 2;

var numTrees = data.children.length;
var curr_tree = [];
var footer = document.getElementById(".footerSec");
var slider = d3.sliderHorizontal().min(0).max(numTrees - 1).step(1).width(width).displayValue(true)
.on('onchange', val =>
 {d3.select('#value').text(val);update(root[val]);RenderSunburstChart(val)});
 svg.attr('width', 500).attr('height', 100).append('g').attr('transform', 'translate(' + margin.top * .5 +',' + height+ ')').call(slider); svg.append("text").attr("y", height + margin.top * 2).attr("x", (width) * .5).attr("dy", "1em").style("text-anchor", "middle").text("Current Frame Number");
 
for(var i = 0; i < numTrees; ++i)
{
 curr_tree.push(data.children[i]);
 // Assigns parent, children, height, depth
 root.push(d3.hierarchy(curr_tree[i], function(d) { return d.children; }));
 root[i].x0 = width / 2;
 root[i].y0 = 0;
}

// Collapse after the second level
//root.children.forEach(collapse);
var slider_num = slider.value();
update(root[slider_num]);

// Collapse the node and all it's children
function collapse(d) {
  if(d.children) {
    d._children = d.children
    d._children.forEach(collapse)
    d.children = null
  }
}

document.getElementById("avgTime").innerHTML = "Avg frame time: " + (data.profileRunTime / (data.children.length + 1)) + " microseconds";
document.getElementById("minTime").innerHTML = "Min frame time: " + d3.min(data.children, function(d) {return d.value}) + " microseconds";
document.getElementById("maxTime").innerHTML = "Max frame time: " + d3.max(data.children, function(d) {return d.value}) + " microseconds";

function update(source) {

  slider_num = slider.value();
  // Assigns the x and y position for the nodes
  var data = treemap(root[slider_num]);

  // Compute the new tree layout.
  var nodes = data.descendants(),
      links = data.descendants().slice(1);

  // Normalize for fixed-depth.
  nodes.forEach(function(d){ 
                              //d.y = d.depth * 180
							  if(d.data.aname != "Top Level")
							  {
								var r = d.data.w_end;
								var l = d.data.w_start;
								var w = (r + l) * .5;
							
							    d.x = w * width;
							  }
							  if(d.data.aname == "Top Level")
							  {
							    d.x = width / 2.0;
							  }
							  
							  var time_ = d.data.p_time;
							  
							  if(time_ < .0001)
								  time_ = .0001;

                              d.y = height * (1.0 - time_); 
                           });

  // ****************** Nodes section ***************************
  function timeFunc(val)
  {
	if(val <= .0001)
	  val = 0.0;
	return val;
  }

  // Update the nodes...
  var node = svg.selectAll('g.node')
      .data(nodes, function(d) {return d.id || (d.id = ++i); });

  // Enter any new modes at the parent's previous position.
  var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr("transform", function(d) {
        return "translate(" + source.x0 + "," + source.y0 + ")";
    })
    .on('click', click)	  
	.on("mouseover", function(d) {
		    tooltip.transition()
			  .style('opacity', 1)
						 
		    tooltip.html(d.data.name + "<br/>% of frame: " + formatDecimal(timeFunc(d.data.unmod_p_time))
			                                                               )
			  .style('left', function(d) {
				                          if(d3.event.offsetX > container.clientWidth / 2.0)
											  return (d3.event.pageX - 200) + 'px';
			                              return (d3.event.pageX + 20) + 'px';}
			  )
			  .style('top', function(d) {
				                          if(d3.event.offsetY > container.clientHeight / 2.0)
				                              return (d3.event.pageY - 100)+'px';
				                          return (d3.event.pageY + 30)+'px';}
			  )
    })
    .on("mouseout", function() {
		  	tooltip.transition()
			  .style('opacity', 0);
    });

  // Add Circle for the nodes
  nodeEnter.append('circle')
      .attr('class', 'node')
      .attr('r', 1e-6)
      .style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#fff";
      });

  // Add labels for the nodes
  nodeEnter.append('text')
      .attr("dy", ".35em")
      .attr("x", function(d) {
          return d.children || d._children ? -13 : 13;
      })
      .attr("text-anchor", function(d) {
          return d.children || d._children ? "end" : "start";
      })
      .text(function(d) { return d.data.aname; });

  // UPDATE
  var nodeUpdate = nodeEnter.merge(node);

  // Transition to the proper position for the node
  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", function(d) { 
        return "translate(" + d.x + "," + d.y + ")";
     })

  // Update the node attributes and style
  nodeUpdate.select('circle.node')
    .attr('r', function(d) {
        return d._children ? 25 / (d.depth + 1) * delta_dist : .5 * (25 / (2 * d.depth + 1)) * delta_dist;
    })
    .style("fill", function(d) {
        return nodeColorDark[d.depth % nodeColorDark.length];
    })
	.style("stroke", function(d) {
        return nodeColorDark[d.depth % nodeColorDark.length];
    })
    .attr('cursor', 'pointer');


  // Remove any exiting nodes
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
          return "translate(" + source.x + "," + source.y + ")";
      })
      .remove()

  // On exit reduce the node circles size to 0
  nodeExit.select('circle')
    .attr('r', 1e-6)

  // On exit reduce the opacity of text labels
  nodeExit.select('text')
    .style('fill-opacity', 1e-6);

  // ****************** links section ***************************

  // Update the links...
  var link = svg.selectAll('path.link')
      .data(links, function(d) { return d.id; });

  // Enter any new links at the parent's previous position.
  var linkEnter = link.enter().insert('path', "g")
      .style("stroke-width", function(d) { return 3.0 / (d.depth + 1.0); })
      .attr("class", "link")
      .attr('d', function(d){
        var o = {x: source.x0, y: source.y0}
        return diagonal(o, o)
      });

  // UPDATE
  var linkUpdate = linkEnter.merge(link);

  // Transition back to the parent element position
  linkUpdate.transition()
      .duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

  // Remove any exiting links
  var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();

  // Store the old positions for transition.
  nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });

  // Creates a curved (diagonal) path from parent to the child nodes
  function     diagonal(s, t) {

        // Calculate some variables based on source and target (s,t) coordinates
        const x = s.x;
        const y = s.y;
        const ex = t.x;
        const ey = t.y;
        let xrvs = ex - x < 0 ? -1 : 1;
        let yrvs = ey - y < 0 ? -1 : 1;
        let rdef = 100;
        let rInitial = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef;
        let r = Math.abs(ey - y) / 2 < rInitial ? Math.abs(ey - y) / 2 : rInitial;
        let h = Math.abs(ey - y) / 2 - r;
        let w = Math.abs(ex - x) - r * 2;

        // Build the path
        const path = `
               M ${x} ${y}
               L ${x} ${y+h*yrvs}
               C  ${x} ${y+h*yrvs+r*yrvs} ${x} ${y+h*yrvs+r*yrvs} ${x+r*xrvs} ${y+h*yrvs+r*yrvs}
               L ${x+w*xrvs+r*xrvs} ${y+h*yrvs+r*yrvs}
               C ${ex}  ${y+h*yrvs+r*yrvs} ${ex}  ${y+h*yrvs+r*yrvs} ${ex} ${ey-h*yrvs}
               L ${ex} ${ey}
             `
        // Return result
        return path;
    }
	
  function FindIDAndFlip(tree, id, fname)
  {
    var ret = 0;
    if(tree.data.c_ID == id)
	{
	  if(tree.data.name == fname)
	  {
	    if(tree.data.node_active == 1)
        {	  
	      tree.data.node_active = 0;
		  tree._children = tree.children;
          tree.children = null;
	    }
	    else 
	    {
	      tree.data.node_active = 1;
          tree.children = tree._children;
          tree._children = null;
	    }
	    ret = 1;
	  }
	}
	else if(tree.children)
	{
	  var size = tree.children.length;
	  for(var i = 0; i < size; ++i)
	  {
	    var result = FindIDAndFlip(tree.children[i], id, fname);
		
		if(result == 1)
		  return ret;
	  }
	}
	
	return ret;
  }

  // Toggle children on click.
  function click(d) {
  
    var nodeID = d.data.c_ID;
	var fname = d.data.name;
	
	for(var i = 0; i < numTrees; ++i)
    {
      var t = root[i];
	  
	  FindIDAndFlip(t, nodeID, fname);
    }
	
    update(d);
  }
}