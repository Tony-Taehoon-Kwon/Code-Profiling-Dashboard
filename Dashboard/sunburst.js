function RenderSunburstChart(frame_num) {
	var container = document.getElementById('function_tree');
  	const breadCrumb = { w: 130, h: 30, s: 5, t: 10 };
	const width = container.clientWidth;
	const height = container.clientHeight;
	const canvasPosX = 0;
	const canvasPosY = 0;
	const trailHeight = 100;
	const graphPosX = width / 2;
	const graphPosY = height / 2 + breadCrumb.h;
	const radius_divider = 10;
	const layer_num = 3;
	const text_color = "#FFFFFF";
	
	var functionsName = ["UpdateFrametime", "UpdateSamples", "UpdateFPS", "CapFrames", "Update",
						 "GetElapsedTime", "SetVelocity", "GetOldPosition", "GetVelocity",
						 "SetOldPosition", "CheckCollisions", "Parse", "UseBatchProgram",
						 "Begin", "UploadSprite", "AddParticles", "UploadParticles",
						 "RenderBatches", "RenderTarget", "Draw", "GameLoop"];
	
	d3.select("#sunburst").selectAll("svg").remove();
	
	var svg = d3.select("#sunburst").append("svg")
		.attr("width", width)
		.attr("height", height)
		.style("font", "15px sans-serif")
		.attr('transform', `translate(${canvasPosX},${canvasPosY})`)
		.on("mouseleave", mouseleave);
	
	const groupElement = svg.append('g')
		.attr('transform', `translate(${graphPosX},${graphPosY})`);
			
	var radius = width / radius_divider;
	
	var format = d3.format(",d");
	
	var color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, functionsName.length + 1));
		
	var arc = d3.arc()
		.startAngle(d => d.x0)
		.endAngle(d => d.x1)
		.padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
		.padRadius(radius * 1.5)
		.innerRadius(d => d.y0 * radius)
		.outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));
	
	const partition = (data) => {
		
		const root = d3.hierarchy(data.children[frame_num])
			.sum(d => d.value)
			.sort((a, b) => b.value - a.value);
			
		root.value -= root.data.value;
		
		for (var root_i = 0; root_i < root.descendants().length; ++root_i)
		{
			if (root.descendants()[root_i].data.childcount != 0)
				root.descendants()[root_i].value -= root.descendants()[root_i].data.value;
		}
					
		return d3.partition()
				.size([2 * Math.PI, root.height + 1])(root);
	}
	
	const root = partition(data);
	
	root.each(d => d.current = d);
	
	const path = groupElement.append("g")
				.selectAll("path")
				.data(root.descendants().slice(1))
				//.data(root.children[frame_num].descendants().slice(1))
				.join("path")
				.attr("fill", d => color(funcShortName(d.data.name)))
				.attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
				.attr("d", d => arc(d.current))
				//.on("mouseover", mouseover)
				.on("mousemove", mousemove);
				
	totalSize = root.value;
	//path.node().__data__.value;
    
	path.filter(d => d.children)
		.style("cursor", "pointer")
		.on("click", clicked);
    
	path.append("title")
		.text(function (d) {
				var funcNameArr = d.ancestors().map(d => d.data.name).reverse();
				var retText = "";
				for (var i = 0; i < funcNameArr.length - 1; ++i)
				{
					retText += funcNameArr[i] + "\n";
					
					for (var j = 0; j < i; ++j)
						retText += "   ";
					
					retText += String.fromCharCode(8627) + " ";
				}
				retText += funcNameArr[funcNameArr.length - 1] + "\n";
				retText += "Function Time : " + `${d.data.value}` + "ms";
				return retText;
			});		
		//.text(d => `${d.ancestors().map(d => d.data.name).reverse().join("\n")}\n${format(d.value)}`);
    
	const label = groupElement.append("g")
		.attr("pointer-events", "none")
		.attr("text-anchor", "middle")
		.style("user-select", "none")
		.selectAll("text")
		//.data(root.children[frame_num].descendants().slice(1))
		.data(root.descendants().slice(1))
		.join("text")
		.style("font-size", "0.5em")
		.attr("fill-opacity", d => +labelVisible(d.current))
		.attr("transform", d => labelTransform(d.current))
		.style("fill", text_color)
		.text(d => funcShortName(d.data.name));
		
	const percentage_text = svg.append("text")
			.attr("id", "title")
			.attr("x", `${graphPosX}`)
			.attr("y", `${graphPosY}`)
			.attr("text-anchor", "middle")
			.style("font-size", "2.0em");
	
	initializeBreadcrumbTrail();
	
	const parent = groupElement.append("circle")
		.datum(root)
		//.datum(root.children[frame_num])
		.attr("r", radius)
		.attr("fill", "none")
		.attr("pointer-events", "all")
		.on("click", clicked);
    
	function clicked(p) {
		//parent.datum(p.parent || root[frame_num]);
		parent.datum(p.parent || root);
    
		root.each(d => d.target = {
			x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
			x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
			y0: Math.max(0, d.y0 - p.depth),
			y1: Math.max(0, d.y1 - p.depth)
		});
    
		const t = groupElement.transition().duration(750);
    
		path.transition(t)
			.tween("data", d => {
				const i = d3.interpolate(d.current, d.target);
				return t => d.current = i(t);
			})
			.filter(function(d) {
				return +this.getAttribute("fill-opacity") || arcVisible(d.target);
			})
			.attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
			.attrTween("d", d => () => arc(d.current));
    
		label.filter(function(d) {
				return +this.getAttribute("fill-opacity") || labelVisible(d.target);
			}).transition(t)
			.attr("fill-opacity", d => +labelVisible(d.target))
			.attrTween("transform", d => () => labelTransform(d.current));
	}
	
	function mouseover(d) {
		
		if (d == null || d.parent == null)
			return;

		if (d.id)
			return;

		var percentage = (100 * d.value / d.parent.value).toPrecision(3);
		var percentageString = percentage + "%";
		if (percentage < 0.1)
			percentageString = "< 0.1%";
		percentage_text.text(percentageString);
		
		var sequenceArray = d.ancestors().reverse();
		sequenceArray.shift();
		//var sequenceArray = [];
		//var current = d;
		//while (current.parent) {
		//	sequenceArray.unshift(current);
		//	current = current.parent;
		//}
		
		d3.selectAll("path")
			.style("opacity", 0.3);
			
		var selectedArc = groupElement.selectAll("path")
			.filter(function(node) {
					return (sequenceArray.indexOf(node) >= 0);
				})
			.style("opacity", 1);
			
		updateBreadcrumbs(sequenceArray, percentageString, selectedArc);
	}
	
	function mousemove(d) {
		// to prevent bug
		mouseover(d);
	}
	
	function mouseleave(d) {
		d3.select("#trail")
			.style("visibility", "hidden");
		
		d3.selectAll("path")
			.transition()
			.duration(200)
			.style("opacity", 1)
			.on("end", function() {
					d3.select(this).on("mouseover", mouseover);
				});
		percentage_text.text("");
	}
	
	function arcVisible(d) {
		return d.y1 <= layer_num + 1 && d.y0 >= 1 && d.x1 > d.x0;
	}
    
	function labelVisible(d) {
		return d.y1 <= layer_num + 1 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.1;
	}
    
	function labelTransform(d) {
		const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
		const y = (d.y0 + d.y1) / 2 * radius;
		return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
	}
	
	function initializeBreadcrumbTrail() {
	  
		var trail = svg.append("svg")
			.attr("width", width)
			.attr("height", trailHeight)
			.attr("id", "trail");
			
		trail.append("text")
			.attr("id", "endlabel")
			.style("fill", "#000");
	}

	function breadcrumbPoints(d, i) {
		var points = [];
		points.push("0,0");
		points.push(breadCrumb.w + ",0");
		points.push(breadCrumb.w + breadCrumb.t + "," + (breadCrumb.h / 2));
		points.push(breadCrumb.w + "," + breadCrumb.h);
		points.push("0," + breadCrumb.h);
		
		if (i > 0)
			points.push(breadCrumb.t + "," + (breadCrumb.h / 2));
		return points.join(" ");
	}

	function updateBreadcrumbs(nodeArray, percentageString, selectedArc) {

		if (selectedArc._groups[0].length == 0)
			return;

		var breadCrumbG = d3.select("#trail")
			.selectAll("g")
			.data(nodeArray, function(d) { return d.data.name + d.depth; });

		var entering = breadCrumbG.enter().append("g")
							.attr("id", function(d, i) { return "layer_" + i });
		
		var breadCrumbColor = selectedArc.style("fill");
		
		entering.append("polygon")
			.attr("id", function(d, i) { return "layer_" + i + "_poly"; } )
			.attr("points", breadcrumbPoints)
			.style("fill", d => color(funcShortName(d.data.name)));
			
		document.getElementById("layer_0_poly").setAttribute("style", `fill: ${breadCrumbColor}`);

		entering.append("text")
			.attr("x", (breadCrumb.w + breadCrumb.t) / 2)
			.attr("y", breadCrumb.h / 2)
			.attr("dy", "0.35em")
			.attr("text-anchor", "middle")
			.style("fill", text_color)
			.text(function(d) { return funcShortName(d.data.name); });
		
		breadCrumbG.attr("transform", function(d, i) {
				//return "translate(" + (d.depth - 1) * (breadCrumb.w + breadCrumb.s) + ", 0)";
				if (i < 4)
					return "translate(" + i * (breadCrumb.w + breadCrumb.s) + ", 0)";
				else
					return "translate(" + (i - 4) * (breadCrumb.w + breadCrumb.s) + ", " + breadCrumb.h * 1.5 + ")";
			});
		
		//for (var layer_index = 0; layer_index < nodeArray.length; ++layer_index)
		//{
		//	var layerArc = d3.select(`#layer_${layer_index}`);
		//	layerArc.select("text")
		//		.attr("x", (breadCrumb.w + breadCrumb.t) / 2 + layer_index * (breadCrumb.w + breadCrumb.s))
		//		.attr("y", breadCrumb.h / 2)
		//		.attr("dy", "0.35em")
		//		.attr("text-anchor", "middle")
		//		.text(nodeArray[layer_index].data.name);
		//		
		//	var points = [];
		//	var offset = breadCrumb.w + breadCrumb.s;
		//	points.push(layer_index * offset + ",0");
		//	points.push(breadCrumb.w + layer_index * offset + ",0");
		//	points.push(breadCrumb.w + breadCrumb.t + layer_index * offset + "," + (breadCrumb.h / 2));
		//	points.push(breadCrumb.w + layer_index * offset + "," + breadCrumb.h);
		//	points.push(layer_index * offset + "," + breadCrumb.h);
		//	
		//	if (layer_index > 0)
		//		points.push(breadCrumb.t + layer_index * offset + "," + (breadCrumb.h / 2));
		//	points.join(" ");
		//	layerArc.select("polygon")
		//		.attr("points", points);
		//	
		//	//d3.select(`#layer_${layer_index}`)
		//	//	.attr("transform", "translate(" 
		//	//		+ layer_index * (breadCrumb.w + breadCrumb.s) 
		//	//		+ ", 0)");
		//}

		breadCrumbG.exit().remove();

		var titleGroup = selectedArc.select("title")._groups[0];
		
		d3.select("#trail").select("#endlabel")
			.attr("x", function() { 
					if(nodeArray.length < 4) 
						return (nodeArray.length + 0.7) * (breadCrumb.w + breadCrumb.s);
					else
						return (nodeArray.length - 3.3) * (breadCrumb.w + breadCrumb.s);
				})
			.attr("y", function() { 
					if(nodeArray.length < 4) 
						return breadCrumb.h / 2;
					else
						return breadCrumb.h * 2;
				})
			.attr("dy", "0.35em")
			.attr("text-anchor", "middle")
			.text("Function Time : " + titleGroup[titleGroup.length - 1].__data__.data.value);

		d3.select("#trail")
			.style("visibility", "");
	}
	
	function funcShortName(funcName) {
		var colonPos = funcName.search("::");
		var parenthesisPos = funcName.search("\\(");
		if (colonPos != -1 && parenthesisPos != -1)
			return funcName.substring(colonPos + 2, parenthesisPos);
		else
			return funcName;
	}
}

RenderSunburstChart(0);



