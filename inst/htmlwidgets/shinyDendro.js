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

		// derived data
		var nitems = null;
		var invOrder = null;
		var tree = null;

		// output data
		var assignment = null;

		// paper.js
		var P = null;

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
				
				var treeBorder=5;
				var bandSize=30;
				var bands=2;

				var treeStart=new P.Size(treeBorder, treeBorder);
				var treeSize=new P.Size(P.view.size.width-2*treeBorder-bands*bandSize, P.view.size.height-2*treeBorder);

				var nTree=2*nitems-1;
				var maxH=tree[nTree-1].height;

				var uc = unassignedColor();

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
						console.log(this.dendroTreeId);
						paintTree(this.dendroTreeId);
						return false;
					};

					tree[i].rectangle=r;
				}

				P.view.update();
		}

		function paintTree(i) {
			//TODO replace by assignment assignment
			tree[i].rectangle.style.fillColor='red';
			P.view.update();
		}

		function set_cluster_colors() {
			for(var i=0; i<2*nitems-1; ++i) {
				//TODO
			}

			P.view.update();
		}

		// Color handling

		function unassignedColor() {
			return new P.Color('#e0e0e0');
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

					/*el.addEventListener('click', function(x) {
						P.project.activeLayer.clear();
						//Shiny.onInputChange(inputId, clickCnt);
					})*/
				}

				initData(x);

				// set the outputs to initial values
				sendOutput();
				redraw();
      },

      resize: function(width, height) {

        // TODO like what, redraw()?

      }

    };
  }
});
