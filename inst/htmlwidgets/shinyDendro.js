HTMLWidgets.widget({

  name: 'shinyDendro',

  type: 'output',

  factory: function(el, width, height) {

	  // tree element classes
		function Leaf(pos, cl){
			this.start=pos;
			this.end=pos+1;
			this.height=0;
			this.children=[];
			this.clusterId=cl;
			this.rectangle=null;
		}

		function Branch(height, fst, fstId, snd, sndId) {
			this.start=fst.start;
			this.end=snd.end;
			//this.start=(fst.start+fst.end)/2;
			//this.end=(snd.start+snd.end)/2;
			this.height=height;
			this.children=[fstId, sndId];
			this.clusterId=null;
			this.rectangle=null;
		}

    // instance output (Shiny input)
		var inputId = null;

		// inputs from clustering
		var height = null;
		var merge = null;
		var order = null;
		var heatmap = null;
		var heatmapNames = null;

		// derived data
		var nitems = null;
		var invOrder = null;
		var tree = null;

		// input state
		var currentCluster = ' ';

		// output data
		var assignment = null;

		// paper.js
		var P = null;
		var PTool = null;
		var PActiveRect = null;
		var PActiveMark = null;
		var PLegendGroup = null;

		// constants for drawing
		var border=2;
		var bandSize=30;
		var legendSize=bandSize*0.9;

		// helper functions
		function merge2tree(i) {
			if(i<0) return -1 - i;
			else return nitems + i - 1;
		}

		function initData(x)
		{
			// feed in the input data
			inputId = x.inputId;

			height = x.height;
			merge = x.merge;
			order = x.order.map(i => i-1);
			if('heatmap' in x) {
				heatmap = x.heatmap;
				heatmapNames = x.heatmapNames;
			} else {
				heatmap = [];
				heatmapNames = [];
			}
				
			nitems = order.length;

			// order :: Position -> ClusterID
			// invOrder :: ClusterID -> Position
			invOrder = new Array(nitems);
			for(var i=0;i<nitems;++i)
				invOrder[order[i]]=i;

			assignment = new Array(nitems);
			for(var i=0;i<nitems;++i)
				assignment[i]=' ';

			tree = new Array(2*nitems-1);
			// fill in the leaves
			for(var i=0;i<nitems;++i)
				tree[i]=new Leaf(invOrder[i], i);

			// branches
			for(var i=0; i<nitems-1; ++i) {
				var l=merge2tree(merge[i][0]);
				var r=merge2tree(merge[i][1]);
				tree[nitems+i]=new Branch(
					height[i],
					tree[l], l,
					tree[r], r);
			}
		}

		function sendOutput() {
			Shiny.onInputChange(inputId, assignment);
		}

		function redraw() {
				P.project.activeLayer.clear();
				
				var bands=2;
				bands += heatmapNames.length;

				var treeStart=new P.Size(border+bandSize, border);
				var treeSize=new P.Size(P.view.size.width-2*border-(bands+1)*bandSize, P.view.size.height-2*border);
				var bandsStart=new P.Size(treeStart.width+treeSize.width, treeStart.height);
				var bandsSize=new P.Size(bandSize*(bands-2), treeSize.height);

				var nTree=2*nitems-1;
				var maxH=tree[nTree-1].height;

				var uc = unassignedColor();

				// draw the tree
				for(var i=nTree-1; i>=0; --i) {
					var w=treeSize.width*tree[i].height/maxH;
					var h=treeSize.height*(tree[i].end-tree[i].start)/nitems;
					var isBranch = i >= nitems;
					
					var r=new P.Path.Rectangle(
						treeStart.width+treeSize.width-w+(isBranch?0:bandSize),
						treeStart.height+treeSize.height*tree[i].start/nitems,
						isBranch ? w+bandSize*1.5 : w+bandSize, h, isBranch?10:0);

					if(isBranch) r.style={
						strokeColor: 'black',
						fillColor: uc,
						strokeWidth: 1,
					};
					else r.style={
						strokeColor: uc,
						fillColor: uc,
						strokeWidth: 1,
					};

					r.dendroTreeId = i;
					r.onMouseDown = function(event){
						paintTree(this.dendroTreeId);
						return false;
					};

					tree[i].rectangle=r;
				}

				// create rasters for the bands and draw them
				for(var i=0; i<heatmapNames.length; ++i) {
					var r = new P.Raster(new P.Size(1,nitems));
					r.pivot = new P.Point(-0.5,-nitems/2.0); //oh you.
					r.position = new P.Point(bandsStart.width + bandSize*(2+i), bandsStart.height);
					r.scale(bandSize,bandsSize.height/nitems);
					r.smoothing=false;

					/* This is moved to R part
					var min=heatmap[0][i];
					var max=min;
					for(var j=1;j<nitems;++j) {
						var tmp=heatmap[j][i];
						if(tmp>max) max=tmp;
						if(tmp<min) min=tmp;
					}
					var scale=max-min;
					if(scale==0) scale=1;*/
					for(var j=0;j<nitems;++j) {
						r.setPixel(0,invOrder[j],expressionColor(heatmap[j][i]));
					}
				}

				// create a rectangle for drawing the active cluster mark
				PActiveRect = new P.Path.Rectangle(border,border,legendSize,legendSize);
				PActiveRect.style={strokeColor: 'black'};

				PActiveMark = new P.PointText(new P.Point(PActiveRect.position.x, PActiveRect.position.y+legendSize*.5*.66));
				PActiveMark.justification='center';
				PActiveMark.fontSize=(legendSize*.66)+'px';
				PActiveMark.fillColor='black';
				PActiveMark.content='???';

				PLegendGroup = new P.Group();

				redrawMarkLegend();
				redrawActiveMark(); //updates the view for us
		}

		function paintTree(i) {
			var queue=[i];
			while(queue.length>0) {
				var cur=queue.shift();
				var ct=tree[cur];
				for(ch in ct.children) queue.push(ct.children[ch]);
				if(ct.clusterId===null) continue;
				assignment[ct.clusterId]=currentCluster;
			}
			sendOutput();
			showClusterColors();
		}

		function gatherClusterColors(assignment) {
			var colLetters = Array.from(new Set(assignment.filter(function(a){return a!=' ';}))).sort();
			var invColLetters = new Map();
			for(var i=0;i<colLetters.length;++i) invColLetters[colLetters[i]]=i;
			var cols = clusterColors(colLetters.length);
			var uc = unassignedColor();
			return {
				letters: colLetters,
				lookup: invColLetters,
				colors: cols,
				uncolor: uc,
			};
		}

		function showClusterColors() {
			var nTree=2*nitems-1;
			var assignments=new Array(nTree);
			for(var i=0; i<nitems; ++i) assignments[i]=assignment[i];
			for(var i=nitems; i<2*nitems-1; ++i) {
				var ct=tree[i];
				if(ct.children.length==0) {
					assignments[i]=' ';
					continue;
				}
				var a=assignments[ct.children[0]];
				for(var j=1; j<ct.children.length; ++j)
					if(a!=assignments[ct.children[j]]) a=' ';
				assignments[i]=a;
			}

			col = gatherClusterColors(assignment);
			for(var i=0; i<nTree; ++i) {
				if(assignments[i]==' ')
					tree[i].rectangle.style.fillColor=col.uncolor;
				else
					tree[i].rectangle.style.fillColor=col.colors[col.lookup[assignments[i]]];
				if(i<nitems)
					tree[i].rectangle.style.strokeColor=tree[i].rectangle.style.fillColor;
			}

			redrawMarkLegend();
			P.view.update();
		}

		function redrawActiveMark() {
			PActiveMark.content = currentCluster;
			PActiveRect.style.strokeColor = (currentCluster==' ')?unassignedColor():'black';
			P.view.update();
		}

		function redrawMarkLegend() {
			var col=gatherClusterColors(assignment);

			PLegendGroup.removeChildren();
			
			var start=border+bandSize;
			var size=P.view.size.height-start-border;

			var sizeForLetter=size/((col.letters.length==0) ? 1 : col.letters.length);
			if(sizeForLetter>bandSize) sizeForLetter=bandSize;

			for(var i=0; i<col.letters.length; ++i) {
				var r = new P.Path.Rectangle(border, start+i*sizeForLetter,legendSize,legendSize);
				console.log(r);
				var c = col.colors[i];
				r.style.fillColor = c;
				PLegendGroup.addChild(r);
				var t = new P.PointText(new P.Point(r.position.x, r.position.y+legendSize*.5*.66));
				t.content=col.letters[i];
				t.justification='center';
				t.fontSize=(legendSize*.66)+'px';
				var approxBrightness = c.red*c.red*.241 + c.green*c.green*.691 + c.blue*c.blue*.068;
				t.fillColor=(approxBrightness>0.4)?'black':'white';
				PLegendGroup.addChild(t);
			}
		}

		// Color handling

		function unassignedColor() {
			return new P.Color('#f0f0f0');
		}

		function clusterColors(nclust) {
			var cols=new Array(nclust);
			for(var i=0; i<nclust; ++i) {
				cols[i]=new P.Color({
					'hue': 360 * i / nclust,
					'saturation': (i%2) ? 1 : 0.7,
					'brightness': (i%2) ? 0.7 : 1,
				})
			}
			return cols;
		}	

		var expressionColorCount = 100;
		var expressionColorCache = null;

		function expressionColor(val) {
			if(expressionColorCache===null) {
				expressionColorCache = new Array(expressionColorCount);
				var origColors=[
					"#A50026",
					"#D73027",
					"#F46D43",
					"#FDAE61",
					"#FEE090",
					"#FFFFA8",
					"#B8D9C8",
					"#91C3E2",
					"#649DD1",
					"#3565B4",
					"#212695"].map(function(str){return new P.Color(str)});

				var nOrigs=origColors.length;

				for(var i=0; i<expressionColorCount; ++i) {
					var q=i/(expressionColorCount-1);
					if(q<0)q=0;
					if(q>1)q=1;
					var slice=q*(nOrigs-1);
					q=slice-Math.trunc(slice);
					slice=Math.trunc(slice);
					if(slice>=nOrigs-1)
					expressionColorCache[i]=origColors[nOrigs-1];
					else
					expressionColorCache[i]=new P.Color(
						origColors[slice].red*(1-q)+origColors[slice+1].red*q,
						origColors[slice].green*(1-q)+origColors[slice+1].green*q,
						origColors[slice].blue*(1-q)+origColors[slice+1].blue*q);
				}
			}

			return expressionColorCache[Math.round((expressionColorCount-1)*val)];
		}

    return {

      renderValue: function(x) {
				// initialize Paper.js and event listeners
				if(P===null) {
					P = new paper.PaperScope();
					P.setup(el);
					P.view.autoUpdate=false;

					PTool = new P.Tool();
					PTool.onKeyDown = function(event) {
						if(event.key=='space') {
							currentCluster = ' ';
							redrawActiveMark();
							return false;
						}
						if(event.key.length==1 && (
							event.key >= 'a' && event.key <= 'z' ||
							event.key >= '0' && event.key <= '9')) {
							currentCluster = event.key;
							redrawActiveMark();
							return false;
						}
						return true;
					};
				}

				initData(x);

				// set the outputs to initial values
				sendOutput();
				redraw();
      },

      resize: function(width, height) {
        redraw();
      }

    };
  }
});
