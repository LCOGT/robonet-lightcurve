// Get the URL query string and parse it
jQuery.query = function() {
		var r = {length:0};
		var q = location.search;
	if(q && q != '#'){
		// remove the leading ? and trailing &
		q = q.replace(/^\?/,'').replace(/\&$/,'');
		jQuery.each(q.split('&'), function(){
			var key = this.split('=')[0];
			var val = this.split('=')[1];
			if(/^[0-9.]+$/.test(val)) val = parseFloat(val);	// convert floats
			r[key] = val;
			r['length']++;
		});
	}
		return r;
};

function RobonetDisplay(inp){

	this.q = $.query();
	this.event = (typeof this.q.event=="string") ? this.q.event : "OB110462";
	// Allow a user provided link to an event in the query string (without the .json extension)
	this.json = "json_files/"+this.event+".json";
	this.broken = "http://lcogt.net/files/no-image_120.png";
	this.id = "carousel";
	this.slideby = 5;
	this.firstload = true;
	this.selected = 0;
	this.series = 3;
	this.delay = 1500;
	this.hideable = true;
	this.loading = false;
	this.pause = 5000;

	this.options = {
		series: {
			lines: { show: false },
			points: { show: true }
		},
		yaxis: {
			label: 'Delta (mag)'
		},
		grid: { hoverable: true, clickable: true }
	};

	if(typeof inp=="object"){
		if(typeof inp.id=="string") this.id = inp.id;
		if(typeof inp.json=="string") this.json = inp.json;
		if(typeof inp.delay=="number") this.delay = inp.delay;
		if(typeof inp.slideby=="number") this.slideby = inp.slideby;
		if(typeof inp.options=="object") this.options = inp.options;
	}
	this.observations = "";
	this.getObservations();
	var _object = this;

	$(document).bind('keypress',{carousel:this},function(e){
		if(!e) e=window.event;
		carousel = e.data.carousel;

		var code = e.keyCode || e.charCode || e.which || 0;
		if(code == 37){
			carousel.selectImage(carousel.selected-1);
			carousel.scrollTo(carousel.selected-1,0);
		}else if(code == 39){
			carousel.selectImage(carousel.selected+1);
			carousel.scrollTo(carousel.selected+1,0);
		}
		if(code == 37 || code == 39){
		}else{
			var character = String.fromCharCode(code).toLowerCase();
			if(character == 's') carousel.stop();
			else if(character == 'p') carousel.start();
		}
	});
	
	// Pre-load the default image to stop <img> tags temporarily going to zero width whilst loading it.
	$.preLoadImages(this.broken);
}

RobonetDisplay.prototype.getObservations = function(json){
	if(typeof json!="string") json = this.json;
	var _object = this;
	$.ajax({
		dataType: "json", 
		url: json,
		context: _object,
		success: function(data){
			_object.data = data;
			_object.updateObservations();
		},
		error: function(e){
			$('#lightcurve').find('div').html('Oops! Something went wrong.<br />The data for <em>'+_object.event+'<\/em> failed to load.');
		}
	});
}
RobonetDisplay.prototype.updateObservations = function(){

	if(typeof this.data!="object" || typeof this.data.event_name!="string") return;

	this.moddata = new Array(this.data.observatories.length);

	$('h1').html("RoboNet Event"+(typeof this.data.event_name=="string" ? ": "+this.data.event_name : ""));
	var minjd,maxjd;
	
	counter = 0;
	// Step through all the data in the JSON file by observatory. Each observatory is a data series
	for(var i = 0; i < this.data.observatories.length ; i++){
		o = this.data.observatories[i];
		// Check if we have errors and gstamps
		err = (typeof o.err=="object") ? true : false;
		gstamp = (typeof o.gstamp=="object") ? true : false;

		this.moddata[i] = [];
		for(var j = 0; j < o.dmag.length ; j++){
			if(!minjd || o.hjd[j] < minjd) minjd = o.hjd[j];
			if(!maxjd || o.hjd[j] > maxjd) maxjd = o.hjd[j];
			// We want to reformat the data as an object for the graph e.g. {x:x, y:y}
			a = { x: o.hjd[j], y: o.dmag[j] };
			if(err) a.err = o.err[j];
			// We can store other info in the graph data object for use in the hover box
			if(gstamp && typeof o.gstamp[j]=="string") a.gstamp = o.gstamp[j];
			// Add this to our data array for this series
			this.moddata[i].push(a);
			counter++;
		}
	}

	// Now we process the model
	this.model = new Array(this.data.model.xval.length);
	for(var i=0 ; i<this.data.model.xval.length ; i++) this.model[i] = ({x:this.data.model.xval[i],y:this.data.model.yval[i]});

	// Now we'll put all the data series together in one array
	this.dataset = [];
	for(var d=0 ; d < this.moddata.length ; d++){
		this.dataset.push({
			data: this.moddata[d],
			points: { show:true, radius: 1.5 },
			title: (this.data.observatories[d].obs_name ? this.data.observatories[d].obs_name : 'Observatory: '+this.data.observatories[d].obs_id),
			color: this.data.observatories[d].html_col,
			lines: { show: false },
			clickable: true,
			hoverable: true,
			hover: { 
				text: function(e){
					if(typeof e.data.gstamp=="string"){
						img = (e.data.gstamp=="") ? this.broken : "http://robonet.lcogt.net/temp/images/{{ gstamp }}.gstamp.gif";
						return "{{xlabel}}: {{x}}<br />{{ylabel}}: {{y}}<br />Uncertainty: {{err}}<br /><a href=\""+img+"\"><img src=\""+img+"\" style=\"width:100%;\" \/><\/a>";
					}else return "{{xlabel}}: {{x}}<br />{{ylabel}}: {{y}}<br />Uncertainty: {{err}}<br />No image";
				},
				before: '{{title}}<br />'
			},
			css: {
				'width': '150px',
				'font-size': '0.8em',
				'background-color': this.data.observatories[d].html_col
			}
		});
	}
	// Add on the model
	this.dataset.push({data:this.model,color: "#999999",points:{show:false},lines:{show:true,width:2}, clickable: false, hoverable:false });

	this.options.xaxis = {log: false,label:'HJD-2450000 (days)',fit:true};

	this.graph = $.graph('lightcurve', this.dataset, this.options);
	this.graph.bind("clickpoint",{carousel:this},function(e){
		e.data.carousel.updateCarousel(e.series);
		e.data.carousel.selectImage(e.n);
		e.data.carousel.scrollTo(e.n);
	}).bind("mousemove",{carousel:this},function(e){
		e.data.carousel.updateCursor(e.x.toFixed(4),e.y.toFixed(4));
	})

	this.updateCarousel();

	return;
}

RobonetDisplay.prototype.updateCursor = function(x,y){
	if($('#cursorpos').length > 0) $('#cursorpos').html(x+', '+y);
}
RobonetDisplay.prototype.updateCarousel = function(series){

	if($('#cursorpos').length > 0){
		o = this.graph.canvas.canvas.offset();
		$('#cursorpos').css({'position':'absolute','top':(o.top+this.graph.chart.top+5),'left':(o.left+this.graph.chart.left+5)});
	}

	// Do we need to create the scroller?
	if($('#'+this.id+' .scroller').length==0){
		$('#'+this.id).append('<div class="scroller"><div class="scrollLeft scrollctrl"><div class="leftarrow"><\/div><\/div><div class="scrollRight scrollctrl"><div class="rightarrow"><\/div><\/div><div class="header">Click data points above to display observations here<\/div><div class="thumbnails"><ul style="width:2000px;"><\/ul><\/div><div class="footer"><\/div><\/div>');
		$('#'+this.id+' .scrollLeft').bind('click',{carousel:this},function(e){
			e.data.carousel.spinCarousel(e.data.carousel.slideby);
		});
		$('#'+this.id+' .scrollRight').bind('click',{carousel:this},function(e){
			e.data.carousel.spinCarousel(-e.data.carousel.slideby);
		});
		$('#'+this.id+' .scrollLeft,#'+this.id+' .scrollRight').bind('mousemove',function(){ $(this).css({cursor:'pointer'}); });
	}

	if(typeof series!="number") return;
	if(series > this.moddata.length) return;


	if(series!=this.series){

		// Reset just in case we've previously cycled through
		this.carouselleft = 0;
		this.selected = 0;
		$('#'+this.id+' .thumbnails ul').css({marginLeft:'0px'});

		var list = "";
		for(var i = 0; i < this.moddata[series].length ; i++){
			if(typeof this.moddata[series][i].gstamp=="string"){
				img = (this.moddata[series][i].gstamp=="") ? this.broken : "http://robonet.lcogt.net/temp/images/"+this.moddata[series][i].gstamp+".gstamp.gif";
				list += '<li><a href="'+img+'"><img src="'+img+'" title="Time: '+this.moddata[series][i].x+' ('+(i+1)+'/'+this.moddata[series].length+')" class="thumb'+i+' thumb" \/><\/a><\/li>';
			}
		}
		$('#'+this.id+' .thumbnails ul').html(list);
	
		// Bind some events to the thumbnails
		for(var i = 0 ; i < this.moddata[series].length ; i++){
			$('img.thumb'+i).bind('click',{carousel:this,num:i},function(e){
				e.preventDefault();
				e.data.carousel.selectImage(e.data.num);
				e.data.carousel.scrollTo(e.data.num);					
			}).bind('error',{carousel:this},function(e){
				this.src = e.data.carousel.broken;
				this.alt = "Image unavailable";
				this.onerror = "";
				return true;
			});
		}
		$('#'+this.id+' .thumbnails img').css({'border-color':this.data.observatories[series].html_col});
	}
	$('#'+this.id+' .thumbnails ul').css({width:this.moddata[series].length*$('.thumbnails li').outerWidth()+'px'});
	if($('#'+this.id).css('width') != $('#'+this.id+' .scroller').css('width')){
		$('#'+this.id+' .scroller').css({'width':$('#'+this.id).css('width')});
	}
	this.series = series;
}

RobonetDisplay.prototype.spinCarousel = function(by){

	if(!by) by = this.slideby;
	li_width = $('#'+this.id+' .thumbnails li').outerWidth();

	var shift = (by*li_width);
	this.carouselleft += shift;
	if(this.carouselleft < 0){
		if(-this.carouselleft < $('#'+this.id+' .thumbnails ul').outerWidth()-li_width){
			$('#'+this.id+' .thumbnails ul').animate({marginLeft:(shift >= 0 ? '+' : '-')+'='+Math.abs(shift)+'px'},(Math.abs(by)==1 ? 0 : 400));
		}else{
			this.carouselleft = -($('#'+this.id+' .thumbnails ul').outerWidth()-li_width);
			$('#'+this.id+' .thumbnails ul').animate({marginLeft:this.carouselleft+'px'},(Math.abs(by)==1 ? 0 : 400));
		}
	}else{
		this.carouselleft = 0;
		$('#'+this.id+' .thumbnails ul').animate({marginLeft:'0px'},(Math.abs(by)==1 ? 0 : 400));
	}
}
RobonetDisplay.prototype.scrollTo = function(i,dt){
	if($('#'+this.id+' .thumbnails ul li').length > i){
		dx = $('#'+this.id+' .thumbnails ul li').eq(this.selected).position().left-(($('#'+this.id+' .thumbnails').outerWidth()-$('#'+this.id+' .thumbnails li').outerWidth())/2);
		this.carouselleft -= dx;
		if(typeof dt!="number") dt = 400;
		$('#'+this.id+' .thumbnails ul').animate({marginLeft:this.carouselleft+'px'},dt);
	}
}

RobonetDisplay.prototype.selectImage = function(sel){

	sel = (sel < 0) ? 0 : sel;
	sel = (sel >= this.moddata[this.series].length) ? this.moddata[this.series].length-1 : sel;
	
	//var fromright = ($('#'+this.id+' .thumbnails').outerWidth()/$('#'+this.id+' .thumbnails li').outerWidth());
	$('#'+this.id+' .thumbnails ul li img').removeClass('active');
	$('#'+this.id+' .thumbnails ul li').eq(sel).find('img').addClass('active');

	this.selected = sel;
	this.setDescription();

	this.graph.removeLines();
	this.graph.addLine({y:this.moddata[this.series][this.selected].y,color:this.data.observatories[this.series].html_col});
	this.graph.addLine({x:this.moddata[this.series][this.selected].x,color:this.data.observatories[this.series].html_col});
	this.graph.canvas.pasteFromClipboard();
	this.graph.drawLines();
}
RobonetDisplay.prototype.setDescription = function(){
	var obs = this.moddata[this.series][this.selected];
	var o = this.data.observatories[this.series];
	img = (obs.gstamp=="") ? this.broken : "http://robonet.lcogt.net/temp/images/"+obs.gstamp+".gstamp.gif";
	difimg = (obs.gstamp=="") ? this.broken : "http://robonet.lcogt.net/temp/images/"+obs.gstamp+".dstamp.gif";
	refimg = (this.data.observatories[this.series].ref=="") ? this.broken : "http://robonet.lcogt.net/temp/images/"+this.data.observatories[this.series].ref+".gstamp.gif";
	$('#info .contents').html('<div style="margin:0px;padding:0px;">Time (HJD - 2450000): '+obs.x+'<br />Delta (magnitudes): '+obs.y+' &plusmn; '+obs.err+'<div class="infoimages"><div class="infoimg"><img src="'+img+'" style="width:150px;height:150px;" \/><br />Image<\/div><div class="infoimg infoimgright"><img src="'+refimg+'" style="width:150px;height:150px;" \/><br />Reference image<\/div><div class="infoimg infoimgright"><img src="'+difimg+'" style="width:150px;height:150px;" \/><br />Difference image<\/div><\/div><\/div>');
	$('#carousel .header').html('Telescope: '+o.obs_name);
	$('#carousel .footer').html((this.selected+1)+' of '+this.moddata[this.series].length);
	$('#info img').bind('error',{carousel:this},function(e){
		this.src = e.data.carousel.broken;
		this.alt = "Image unavailable";
		this.onerror = "";
		return true;
	})
	$('#info .arrow').css('border-color','transparent transparent '+this.data.observatories[this.series].html_col+' transparent');
	$('#info').css('background-color',this.data.observatories[this.series].html_col).show();
}

if(typeof jQuery != 'undefined'){
	var cache = [];
	// Arguments are image paths relative to the current page.
	$.preLoadImages = function() {
		var args_len = arguments.length;
		for (var i = args_len; i--;) {
			var cacheImage = document.createElement('img');
			cacheImage.src = arguments[i];
			cache.push(cacheImage);
		}
	}
}	